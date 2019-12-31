// Note: only parameters starting with `mock` are allowed
// https://github.com/facebook/jest/blob/116303baf711df37304986897582eb8078aa24d8/packages/babel-plugin-jest-hoist/src/index.ts#L17
function mockModules(mockRetryBatches) {
    jest.mock('../../../lib/getCollection', function() {
        async function getCollection() {
            return {
                // used in getRetryBatches
                find() {
                    return {
                        async limit() {
                            return mockRetryBatches;
                        }
                    }
                },
                // used in deleteRetryBatch
                async deleteOne({ activationId }) {
                    return { activationId }
                },
                // used in updateRetryBatch
                async updateOne({ activationId }, { $set: updates }) {
                    return {
                        activationId,
                        updates
                    };
                }
            };
        }
        getCollection.instances = { MESSAGES: 'MESSAGES' };
        return getCollection;
    });
}

// start mock data
const messageForNow = {
    topic: 'some-topic',
    value: {
        id: 'some-value',
        metadata: {
            retries: 0,
            nextRetry: 0
        }
    }
};
const valueWithUpdateRetriesMetadata = {
    ...messageForNow.value,
    metadata: {
        ...messageForNow.value.metadata,
        retries: 1
    }
};
const messageForLater = {
    topic: 'some-topic',
    value: {
        id: 'some-value-for-later',
        metadata: {
            retries: 0,
            nextRetry: (new Date().getTime()) + 1000
        }
    }
};
// end mock data

describe('handleMessagesLogs', function() {
    beforeEach(() => {
        jest.resetModules();
    });

    it('requeues messages and deletes the batch if none of the messages need to be retried later', async function() {
        const messages = [messageForNow];
        const batch = {
            activationId: 'messages-for-now-activation-id',
            messages
        };
        mockModules([batch]);
        const handleMessagesLogs = require('../');
        const results = await handleMessagesLogs({});

        // messageForNow should be requeued and cleanup should delete the batch
        expect(results.success.length).toBe(1);
        expect(results.success[0].cleanupResult.deleted).toBeTruthy();
        expect(results.success[0].cleanupResult.deleted.activationId).toBe(batch.activationId);
        expect(results.success[0].cleanupResult.updated).toBe(undefined);
        expect(results.success[0].requeueResult).toBeTruthy();
        expect(results.failure.length).toBe(0);
    });

    it('requeues messages and updates the batch if some of the messages should be retried later', async function() {
        const messages = [messageForNow, messageForLater];
        const batch = {
            activationId: 'messages-for-now-activation-id',
            messages
        };
        mockModules([batch]);
        const handleMessagesLogs = require('../');
        const results = await handleMessagesLogs({});

        // messageForNow should be requeued and cleanup should remove it from the messages of the batch
        expect(results.success.length).toBe(1);
        expect(results.success[0].cleanupResult.deleted).toBe(undefined);
        expect(results.success[0].cleanupResult.updated).toBeTruthy();
        expect(results.success[0].cleanupResult.updated.activationId).toBe(batch.activationId);
        expect(results.success[0].cleanupResult.updated.updates.messages[0]).toBe(messageForLater);
        expect(results.success[0].requeueResult.topicMessages[0].values.length).toEqual(1);
        expect(results.success[0].requeueResult.topicMessages[0].values[0])
            .toEqual(JSON.stringify(valueWithUpdateRetriesMetadata));
        expect(results.failure.length).toBe(0);
    });
});
