const { addErrorHandling } = require('../utils');
const rp = require('request-promise');

const {
    findUnresolvedBatches,
    getDeleteBatch,
    getFindMessages,
    getStoreDlqMessages,
    getStoreRetryMessages
} = require('../../lib/messagesLogs');

const MAX_RETRIES = 24;
const INTERVAL_PER_RETRY = 10 * 60 * 1000;

function getValueWithUpdatedMetadata(value, activationEnd) {
    const metadata = value.metadata || {};
    const retries = metadata.retries || 0;
    return {
            ...value,
            metadata: {
                ...metadata,
                retries,
                lastRetry: activationEnd,
                nextRetry: activationEnd + INTERVAL_PER_RETRY * retries
            }
    };
}

function groupMessages(messages, activationEnd ) {
    return messages.reduce(function ({ retry, dlq }, message) {
        if (message.value.metadata && messages.value.metadata.retries >= MAX_RETRIES) {
            dlq.push(message);
        } else {
            retry.push({
                ...message,
                value: getValueWithUpdatedMetadata(message.value, activationEnd)
            });
        }
        return {
            retry,
            dlq
        }
    }, {
        retries: [],
        dlq: []
    });
}

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
            let groupedMessages = {
                dlq: [],
                retry: []
            }
            // if an activation has failed for any reason but timeout, send all of its messages to DLQ
            if (!activationTimedout) {
                groupedMessages.dlq = messages;
            } else {
                // if an activation has timedout, we retry the messages that has not been retried MAX_RETRIES times
                // and send the rest to be DLQed
                groupedMessages = groupMessages(messages, activationInfo.end );
            }
            if (groupedMessages.dlq.length) {
                const storeDlqMessages = getStoreDlqMessages(params);
                await storeDlqMessages(groupedMessages.dlq, { activationInfo });
            }
            if (groupedMessages.retry.length) {
                const storeRetryMessages = getStoreRetryMessages(params);
                await storeRetryMessages(groupedMessages.retry, { activationInfo });
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
