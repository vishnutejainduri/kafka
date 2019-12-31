function getTopicValuesWithUpdatedRetriesMetadata (messages) {
    return messages.reduce((byTopic, { value, topic }) => {
        const valueWithUpdatedMetadata = {
            ...value,
            metadata: {
                ...value.metadata,
                retries: value.metadata.retries + 1
            }
        };
        if (byTopic[topic]) {
            byTopic[topic].push(valueWithUpdatedMetadata);
        } else {
            byTopic[topic] = [valueWithUpdatedMetadata];
        }
        return byTopic;
    }, {});
}

function getTopicMessages(topicValues) {
    return Object.entries(topicValues)
        .reduce((reduced, [topic, values]) => {
            reduced.push({
                topic,
                values: values.map(JSON.stringify)
            });
            return reduced;
        }, []);
}

function groupMessagesByRetryTime(messages) {
    const time = new Date().getTime();
    return messages.reduce(function ({ now, later }, message) {
        const nextRetry = message.value.metadata.nextRetry;
        (time >= nextRetry ? now : later).push(message);
        return { now, later }
    }, { now: [], later: [] });
}

function groupResultByStatus(result) {
    return result
        .reduce(function ({ success, failure }, response) {
            (response instanceof Error ? failure : success).push(response);
            return { success, failure }
        },{ success: [], failure: []});
}

module.exports = {
    groupResultByStatus,
    groupMessagesByRetryTime,
    getTopicValuesWithUpdatedRetriesMetadata,
    getTopicMessages
}
