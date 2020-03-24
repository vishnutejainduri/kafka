const rp = require('request-promise');

const { addErrorHandling } = require('../utils');
const {
    findBatches,
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

    async function resolveBatchWithActivationInfo({ activationId, failureIndexes }) {
        const activationInfo = await fetchActivationInfo(activationId);
        if (!activationInfo) {
            return null;
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
        const hasFailed = !activationInfo.response.success;
        const hasFailedMessages = failureIndexes && failureIndexes.length > 0;
        if (hasFailed || hasFailedMessages) {
            const findMessages = await getFindMessages(params);
            const allMessages = await findMessages(activationId) || [];
            const activationTimedout = activationInfo.annotations.find(({ key }) => key === 'timeout').value === true;
            console.log("hasFailedMessages: ", hasFailedMessages);
            if (activationTimedout || hasFailedMessages) {
                const messages = hasFailed
                    ? allMessages
                    : allMessages.filter((_, index) => failureIndexes.includes(index));
                messagesByNextAction = groupMessagesByNextAction(messages, activationInfo.end);
            } else {
                messagesByNextAction.dlq = allMessages;
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

    try {
        const unresolvedBatches = await findBatches(params);
        const resolveBatchesResult = await Promise.all(
            unresolvedBatches.map(addErrorHandling(resolveBatchWithActivationInfo))
        );

        return {
            unresolvedBatches,
            resolveBatchesResult: resolveBatchesResult
                .filter(result => result !== null)
                .map(result => result instanceof Error
                    ? {
                        error: true,
                        errorMessage: result.message,
                        activationId: result.activationId
                    }
                    : {
                        success: true,
                        activationId: result.activationId,
                        messagesByNextAction: {
                            retried: result.messagesByNextAction.retry.length,
                            dlqed: result.messagesByNextAction.dlq.length
                        }
                    }
                )
        };
    } catch (error) {
        return {
            error
        }
    }
}

module.exports = global.main;
