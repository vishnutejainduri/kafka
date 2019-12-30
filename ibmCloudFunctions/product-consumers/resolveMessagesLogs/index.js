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
    const unresolvedBatches = await findUnresolvedBatches(params);

    async function fetchActivationInfo(activationId) {
        return rp({
            uri: encodeURI(`${params.ibmcloudFunctionsRestEndpoint}/namespaces/${params.ibmcloudFunctionsRestNamespace}/activations/${activationId}`),
            method: 'GET',
            auth: {
                user: params.ibmcloudFunctionsRestUsername,
                pass: params.ibmcloudFunctionsRestPassword,
            },
            json: true
        });
    }

    async function resolveBatchWithActivationInfo({ activationId }) {
        const activationInfo = await fetchActivationInfo(activationId);
        if (!activationInfo) return null;
        if (activationInfo.error) throw new Error(activationInfo.error);
        // if an activation has failed, the messages in the batch should be either DLQed or retried
        // TODO HRC-1184: implement a mechanism to handle partial failures
        if (!activationInfo.response.success) {
            const findMessages = await getFindMessages(params);
            const messages = findMessages(activationId);
            const activationTimedout = activationInfo.annotations.find(({ key }) => key === 'timeout').value === true;
            let messagesByNextAction = {
                dlq: [],
                retry: []
            }
            // if an activation has failed for any reason but timeout, send all of its messages to DLQ
            if (!activationTimedout) {
                messagesByNextAction.dlq = messages;
            } else {
                // if an activation has timedout, we retry the messages that has not been retried MAX_RETRIES times
                // and send the rest to be DLQed
                messagesByNextAction = groupMessagesByNextAction(messages, activationInfo.end );
            }
            if (messagesByNextAction.dlq.length) {
                const storeDlqMessages = getStoreDlqMessages(params);
                await storeDlqMessages(messagesByNextAction.dlq, { activationInfo });
            }
            if (messagesByNextAction.retry.length) {
                const storeRetryMessages = getStoreRetryMessages(params);
                await storeRetryMessages(messagesByNextAction.retry, { activationInfo });
            }
        }
        // if a batch was successful or if we successfuly DLQed or requeued all of its messages for retry,
        // we delete the activation record
        const deleteBatch = await getDeleteBatch(params);
        return deleteBatch(activationId);
    }

    const resolveBatchesInfo = await Promise.all(
        unresolvedBatches.map(addErrorHandling(resolveBatchWithActivationInfo))
    );

    return {
        unresolvedBatches,
        resolveBatchesInfo
    };
}

module.exports = global.main;
