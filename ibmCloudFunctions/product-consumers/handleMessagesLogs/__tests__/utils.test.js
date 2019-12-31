const {
    getTopicValuesWithUpdatedRetriesMetadata,
    getTopicMessages,
    groupMessagesByRetryTime,
    groupResultByStatus
} = require('../utils');

// start: mock data
const metadata = {
    retries: 0
};
const someTopicMessage = {
    topic: 'some-topic',
    value: {
        id: 'some-value-for-some-topic',
        metadata
    }
};
const someTopicWithAnotherValueMessage = {
    topic: 'some-topic',
    value: {
        id: 'another-value-for-some-topic',
        metadata
    }
};
const anotherTopicMessage = {
    topic: 'another-topic',
    value: {
        id: 'some-value-for-another-topic',
        metadata
    }
};

const messages = [
    someTopicMessage,
    someTopicWithAnotherValueMessage,
    anotherTopicMessage
];

const updatedMetadata = { retries: 1 };
const valuesByTopicWithUpdatedRetriesMetadata = {
    [someTopicMessage.topic]: [
        { ...someTopicMessage.value, metadata: updatedMetadata },
        { ...someTopicWithAnotherValueMessage.value, metadata: updatedMetadata }
    ],
    [anotherTopicMessage.topic]: [
        { ...anotherTopicMessage.value, metadata: updatedMetadata }
    ]
};
// end: mock data

describe('getTopicValuesWithUpdatedRetriesMetadata,', function() {
    it('handles empty messages', function() {
        expect(getTopicValuesWithUpdatedRetriesMetadata([]))
        .toEqual({});
    });
    it('groups the messages', function() {
        expect(getTopicValuesWithUpdatedRetriesMetadata(messages))
            .toEqual(valuesByTopicWithUpdatedRetriesMetadata);
    });
});

describe('getTopicMessages', function() {
    it('handles empty values by topic', function() {
        expect(getTopicMessages({}))
        .toEqual([]);
    });
    it('creates messages by topic', function() {
        const topicMessages = [
            {
                topic: someTopicMessage.topic,
                messages: valuesByTopicWithUpdatedRetriesMetadata[someTopicMessage.topic]
                    .map(value => ({ value: JSON.stringify(value) }))
            },
            {
                topic: anotherTopicMessage.topic,
                messages: valuesByTopicWithUpdatedRetriesMetadata[anotherTopicMessage.topic]
                    .map(value => ({ value: JSON.stringify(value) }))
            }
        ];
        expect(getTopicMessages(valuesByTopicWithUpdatedRetriesMetadata))
            .toEqual(topicMessages);
    });
});

describe('groupMessagesByRetryTime', function() {
    it('handles empty messages', function() {
        expect(groupMessagesByRetryTime([]))
        .toEqual({
            now: [],
            later: []
        });
    });
    it('filters out messages that should be retried now', function() {
        const messageForNow = {
            ...someTopicMessage,
            value: {
                ...someTopicMessage.value,
                metadata: {
                    nextRetry: 0
                }
            }
        };
        expect(groupMessagesByRetryTime([messageForNow]))
            .toEqual({
                now: [messageForNow],
                later: []
            });
    });
    it('filters out messages that should be retried later', function() {
        const messageForLater = {
            ...someTopicMessage,
            value: {
                ...someTopicMessage.value,
                metadata: {
                    nextRetry: (new Date().getTime()) + 1000
                }
            }
        };
        expect(groupMessagesByRetryTime([messageForLater]))
            .toEqual({
                now: [],
                later: [messageForLater]
            });
    });
});

describe('groupResultByStatus', function() {
    it('filters out instances of error', function() {
        const error = new Error('some error');
        const result = [error];
        expect(groupResultByStatus(result).failure[0].message)
            .toBe(error.message);
    });
    it('filters out instances of error', function() {
        const response = {};
        const result = [response];
        expect(groupResultByStatus(result).success[0])
            .toBe(response);
    });
});
