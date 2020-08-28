const rp = require('request-promise');

const { addErrorHandling, log } = require('../utils');
const createError = require('../../lib/createError');

const {
    findUnresolvedBatches,
    getDeleteBatch,
    getFindMessages,
    getStoreDlqMessages,
    getStoreRetryMessages,  
    getStoreSuccessMessages
} = require('../../lib/messagesLogs');
const { groupMessagesByNextAction } = require('./utils');

let iamAccessToken = {};

global.main = async function(params) {
    if (
        params.cloudFunctionsIsIam
        // to be on the safe side, if less than 10 minutes is left till expiration of the token, we get a new one
        && (!iamAccessToken.access_token || (iamAccessToken.expiration * 1000 - new Date().getTime()) < 10 * 60 * 1000)
    ) {
        // https://cloud.ibm.com/docs/iam?topic=iam-iamtoken_from_apikey#parameters
        iamAccessToken = (await rp({
            uri: params.identityTokenRestEndpoint,
            method: 'POST',
            form: {
                grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
                // https://cloud.ibm.com/docs/iam?topic=iam-serviceidapikeys#create_service_key
                apikey: params.cloudFunctionsApiKey
            },
            json: true
        }))
    }
    async function fetchActivationInfo(activationId) {
        const uri = encodeURI(`${params.cloudFunctionsRestEndpoint}/namespaces/${params.cloudFunctionsIsIam ? params.cloudFunctionsNamespaceGuid : params.cloudFunctionsNamespace}/activations/${activationId}`);
        // https://cloud.ibm.com/apidocs/functions#authentication
        const auth = params.cloudFunctionsIsIam
            ? {
                bearer: iamAccessToken.access_token
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
        if (!activationInfo || activationInfo.error) {
            const originalError = !activationInfo ? new Error(`Could not find activation info for actvation ID ${activationId}`) : activationInfo.error
            const error = createError.resolveMessageLogs.batchFailure(originalError,{ activationId, failureIndexes })
            throw error
        }
        let messagesByNextAction = {
            dlq: [],
            retry: []
        };
        let storeMessagesByNextActionResult = {
            dlq: null,
            retry: null
        };
        let successMessages = [];

        // if an activation has failed or has partial failures, the messages in the batch should be either DLQed or retried
        const hasFailed = !activationInfo.response.success;
        const hasFailedMessages = failureIndexes && failureIndexes.length > 0;

        const debugInfo = { activationId, failureIndexes };
        const findMessages = await getFindMessages(params);
        const allMessages = await findMessages(activationId).catch(originalError => {
            const error = createError.resolveMessageLogs.failedToFetchMessages(originalError, debugInfo)
            log.error(error)
            throw error
        });

        if (hasFailed || hasFailedMessages) {
            const failedMessages = hasFailed
                ? allMessages
                : allMessages.filter((_, index) => failureIndexes.includes(index));
            messagesByNextAction = groupMessagesByNextAction(failedMessages, activationInfo.end, params.maxRetries);

            if (messagesByNextAction.dlq.length) {
                const storeDlqMessages = await getStoreDlqMessages(params);
                log(`DLQing messages: initiating ${messagesByNextAction.dlq.length} messages to be DLQed for activation ID: ${activationId}.`)
                storeMessagesByNextActionResult.dlq = await storeDlqMessages(messagesByNextAction.dlq, { activationInfo }).catch(originalError => {
                    const error = createError.resolveMessageLogs.failedToDlq(originalError, debugInfo)
                    log.error(error)
                    throw error
                })
                log(`DLQing messages: successfully DLQed ${messagesByNextAction.dlq.length} messages for activation ID: ${activationId}.`)
            }
            if (messagesByNextAction.retry.length) {
                const storeRetryMessages = await getStoreRetryMessages(params);
                log(`Retrying messages: initiating ${messagesByNextAction.retry.length} messages to be queued for retried for activation ID: ${activationId}.`)
                storeMessagesByNextActionResult.retry = await storeRetryMessages(messagesByNextAction.retry, { activationInfo }).catch(originalError => {
                    const error = createError.resolveMessageLogs.failedToRetry(originalError, debugInfo)
                    log.error(error)
                    throw error
                })
                log(`Retrying messages: successfully queued ${messagesByNextAction.retry.length} messages to be retried activation ID: ${activationId}.`)
            }
        } 
        if (!hasFailed) {
          successMessages = !hasFailed && !hasFailedMessages
              ? allMessages
              : allMessages.filter((_, index) => !failureIndexes.includes(index));
          // if a batch was successful, we save it to a success collection for logging purposes
          const storeSuccessMessages = await getStoreSuccessMessages(params);
          log(`Successful messages: initiating ${successMessages.length} messages to be stored for activation ID: ${activationId}.`)
          await storeSuccessMessages(successMessages, { activationInfo }).catch(originalError => {
              const error = createError.resolveMessageLogs.failedToStoreSuccess(originalError, debugInfo)
              log.error(error)
              throw error
          })
          log(`Successful messages: successfully queued ${successMessages.length} messages to be stored for activation ID: ${activationId}.`)
        }

        // if a batch was successful or successfuly DLQed or requeued its messages for retry,
        // we delete the activation record
        const deleteBatch = await getDeleteBatch(params);
        await deleteBatch(activationId);
        log(`Successfully resolved messages for activation ID: ${activationId}.`)
        return {
            dlqed: messagesByNextAction.dlq.length,
            retried: messagesByNextAction.retry.length,
            success: successMessages.length,
            activationId
        };
    }

    try {
        const batches = await findUnresolvedBatches(params);
        const resolveBatchesResult = []
        for (const batch of batches) {
            const result = await addErrorHandling(resolveBatchWithActivationInfo)(batch)
            resolveBatchesResult.push(result)
        }

        const failedToResolve = resolveBatchesResult.reduce((resolutionFailures, result, index) => {
            if (result instanceof Error) {
                log.error(`Failed to resolve batch with activationId ${batches[index].activationId}`)
                log.error(result)
                return resolutionFailures + 1
            } else {
                return resolutionFailures
            }
        }, 0)
        const counts = {
            successfullyResolved:  resolveBatchesResult.length - failedToResolve,
            failedToResolve
        }
        if (failedToResolve > 0) {
            log.error(createError.resolveMessageLogs.partialFailure(null, counts))
        }

        return {
            counts,
            resolveBatchesResult: resolveBatchesResult
                .map((result, index) => result instanceof Error
                    ? {
                        resolved: false,
                        errorMessage: result.message,
                        batch: batches[index]
                    }
                    : {
                        resolved: true,
                        batch: batches[index],
                        dlqed: result.dlqed,
                        retried: result.retried,
                        success: result.success
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
