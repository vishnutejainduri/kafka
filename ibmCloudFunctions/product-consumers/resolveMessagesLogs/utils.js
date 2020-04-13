const MAX_RETRIES = 7;
const INTERVAL_GROWTH_RATE = 15 * 60 * 1000;

function getValueWithUpdatedMetadata(value, activationEndTime) {
    const metadata = value.metadata || {};
    const retries = metadata.retries || 0;
    return {
            ...value,
            metadata: {
                ...metadata,
                retries,
                lastRetry: activationEndTime,
                nextRetry: activationEndTime + INTERVAL_GROWTH_RATE * Math.pow(2, retries)
                // Current implementation requires a process job that is invoked regularly in a high frequency e.g. every minute and finds all the messages
                // that have had a next retry before the process job run.
                // Alternative implementation: next retry could instead be a bucket e.g. immediately for retries 0 to 2 and next hours for retries 2 to 4, etc.
                // and then the messages for each bucket would be periodically queued at set intervals
                // e.g. every minute for immediate retries and every 1 hour for next hours messages.
            }
    };
}

function groupMessagesByNextAction(messages, activationEndTime, maxRetries = MAX_RETRIES) {
    return messages.reduce(function ({ retry, dlq }, message) {
        if (message.value.metadata && message.value.metadata.retries >= maxRetries) {
            dlq.push(message);
        } else {
            retry.push({
                ...message,
                value: getValueWithUpdatedMetadata(message.value, activationEndTime)
            });
        }
        return {
            retry,
            dlq
        }
    }, {
        retry: [],
        dlq: []
    });
}

groupMessagesByNextAction.getValueWithUpdatedMetadata = getValueWithUpdatedMetadata;

module.exports = {
    groupMessagesByNextAction,
    MAX_RETRIES, // exported for tests
    INTERVAL_GROWTH_RATE // exported for tests
};
