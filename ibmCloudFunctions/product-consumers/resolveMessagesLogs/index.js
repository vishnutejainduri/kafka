const { addErrorHandling } = require('../utils');
const rp = require('request-promise');

const {
    findUnresolvedBatches,
    getDeleteBatch,
    getFindMessages,
    getStoreDlqMessages,
    getStoreRetryMessages
} = require('../../lib/messagesLogs');
const { groupMessagesByNextAction } = require('./utils');

global.main = async function(params) {
    async function fetchActivationInfo(activationId) {
        return rp({
            uri: encodeURI(`${params.cloudFunctionsRestEndpoint}/namespaces/${params.cloudFunctionsNamespace}/activations/${activationId}`),
            method: 'GET',
            auth: {
                user: params.cloudFunctionsRestUsername,
                pass: params.cloudFunctionsRestPassword,
            },
            json: true
        });
    }

    async function resolveBatchWithActivationInfo({ activationId }) {
        const activationInfo = await fetchActivationInfo(activationId);
        if (!activationInfo) {
            return {
                [activationId]: activationInfo
            };
        }
        if (activationInfo.error) throw new Error(activationInfo.error);
        // if an activation has failed, the messages in the batch should be either DLQed or retried
        let messagesByNextAction = {
            dlq: [],
            retry: []
        };
        let storeMessagesByNextActionResult = {
            dlq: null,
            retry: null
        };
        // TODO HRC-1184: implement a mechanism to handle partial failures
        if (!activationInfo.response.success) {
            const findMessages = await getFindMessages(params);
            const messages = await findMessages(activationId);
            const activationTimedout = activationInfo.annotations.find(({ key }) => key === 'timeout').value === true;
            // if an activation has failed for any reason but timeout, send all of its messages to DLQ
            if (!activationTimedout) {
                messagesByNextAction.dlq = messages;
            } else {
                // if an activation has timedout, we retry the messages that has not been retried MAX_RETRIES times
                // and send the rest to be DLQed
                messagesByNextAction = groupMessagesByNextAction(messages, activationInfo.end );
            }
            if (messagesByNextAction.dlq.length) {
                const storeDlqMessages = await getStoreDlqMessages(params);
                storeMessagesByNextActionResult.dlq = await storeDlqMessages(messagesByNextAction.dlq, { activationInfo });
            }
            if (messagesByNextAction.retry.length) {
                const storeRetryMessages = await getStoreRetryMessages(params);
                storeMessagesByNextActionResult.retry = await storeRetryMessages(messagesByNextAction.retry, { activationInfo });
            }
        }
        // if a batch was successful or if we successfuly DLQed or requeued all of its messages for retry,
        // we delete the activation record
        const deleteBatch = await getDeleteBatch(params);
        const deleteBatchResult = await deleteBatch(activationId);

        return {
            activationId,
            activationInfo,
            messagesByNextAction,
            storeMessagesByNextActionResult,
            deleteBatchResult
        };
    }

    const unresolvedBatches = await findUnresolvedBatches(params);

    const resolveBatchesResult = await Promise.all(
        unresolvedBatches.map(addErrorHandling(resolveBatchWithActivationInfo))
    );

    return {
        unresolvedBatches,
        resolveBatchesResult: resolveBatchesResult
            .map(result => result instanceof Error
                ? { error: true, message: result.message }
                : result
            )
    };
}

module.exports = global.main;
