const rp = require('request-promise');

const { addErrorHandling, log } = require('../utils');
const {
    findBatches,
    getDeleteBatch,
    getFindMessages,
    getStoreDlqMessages,
    getStoreRetryMessages
} = require('../../lib/messagesLogs');
const { groupMessagesByNextAction } = require('./utils');

global.main = async function(params) {
    async function fetchIamToken () {
        return rp({
            uri: params.identityTokenRestEndpoint,
            method: 'POST',
            form: {
                'grant_type': 'urn:ibm:params:oauth:grant-type:apikey',
                'apikey': `${params.cloudFunctionsApiKey}`
            },
            json: true
        });
    }

    async function fetchActivationInfo(activationId) {
        const uri = encodeURI(`${params.cloudFunctionsRestEndpoint}/namespaces/${params.cloudFunctionsIam ? params.cloudFunctionsNamespaceGuid : params.cloudFunctionsNamespace}/activations/${activationId}`);
        const auth = params.cloudFunctionsIam
        ? {
            bearer: await fetchIamToken()
        }
        : {
            user: params.cloudFunctionsRestUsername,
            pass: params.cloudFunctionsRestPassword,
        };
        return rp({
            uri,
            method: 'GET',
            auth,
            json: true
        });
    }

    async function resolveBatchWithActivationInfo({ activationId, failureIndexes }) {
        const activationInfo = await fetchActivationInfo(activationId);
        if (!activationInfo) {
            return null;
        }
        if (activationInfo.error) throw new Error(activationInfo.error);
        // if an activation has failed or has partial failures, the messages in the batch should be either DLQed or retried
        let messagesByNextAction = {
            dlq: [],
            retry: []
        };
        let storeMessagesByNextActionResult = {
            dlq: null,
            retry: null
        };
        const hasFailed = !activationInfo.response.success;
        const hasFailedMessages = failureIndexes && failureIndexes.length > 0;
        if (hasFailed || hasFailedMessages) {
            const findMessages = await getFindMessages(params);
            const allMessages = await findMessages(activationId) || [];
            const messages = hasFailed
                ? allMessages
                : allMessages.filter((_, index) => failureIndexes.includes(index));
            messagesByNextAction = groupMessagesByNextAction(messages, activationInfo.end, params.maxRetries);
            if (messagesByNextAction.dlq.length) {
                const storeDlqMessages = await getStoreDlqMessages(params);
                log.error(`DLQing messages: ${messagesByNextAction.dlq.length} messages DLQed with activation info: ${activationInfo}`)
                storeMessagesByNextActionResult.dlq = await storeDlqMessages(messagesByNextAction.dlq, { activationInfo });
            }
            if (messagesByNextAction.retry.length) {
                const storeRetryMessages = await getStoreRetryMessages(params);
                log.warn(`Retrying messages: ${messagesByNextAction.retry.length} messages queued for retry with activation info: ${activationInfo}`)
                storeMessagesByNextActionResult.retry = await storeRetryMessages(messagesByNextAction.retry, { activationInfo });
            }
        }
        // if a batch was successful or if we successfuly DLQed or requeued its messages for retry,
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
