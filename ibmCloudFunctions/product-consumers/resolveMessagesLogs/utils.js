const MAX_RETRIES = 24;
const INTERVAL_PER_RETRY = 10 * 60 * 1000;

function getValueWithUpdatedMetadata(value, activationEndTime) {
    const metadata = value.metadata || {};
    const retries = metadata.retries || 0;
    return {
            ...value,
            metadata: {
                ...metadata,
                retries,
                lastRetry: activationEndTime,
                nextRetry: activationEndTime + INTERVAL_PER_RETRY * retries
                // Current implementation requires a process job that is invoked regularly in a high frequency e.g. every minute and finds all the messages
                // that have had a next retry before the process job run.
                // Alternative implementation: next retry could instead be a bucket e.g. immediately for retries 0 to 2 and next hours for retries 2 to 4, etc.
                // and then the messages for each bucket would be periodically queued at set intervals
                // e.g. every minute for immediate retries and every 1 hour for next hours messages.
            }
    };
}

function groupMessages(messages, activationEndTime ) {
    return messages.reduce(function ({ retry, dlq }, message) {
        if (message.value.metadata && message.value.metadata.retries >= MAX_RETRIES) {
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

groupMessages.getValueWithUpdatedMetadata = getValueWithUpdatedMetadata;

module.exports = {
    groupMessages
};
