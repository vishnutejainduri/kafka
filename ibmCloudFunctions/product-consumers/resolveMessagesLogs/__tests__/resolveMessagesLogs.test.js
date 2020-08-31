const { MAX_RETRIES } = require('../utils');

// Note: only parameters starting with `mock` are allowed
// https://github.com/facebook/jest/blob/116303baf711df37304986897582eb8078aa24d8/packages/babel-plugin-jest-hoist/src/index.ts#L17
function mockModules({
    mockBatch,
    mockActivationInfo,
    mockMessages
}) {
    jest.mock('../../../lib/getCollection', function() {
        async function getCollection() {
            return {
                // used in findUnresolvedBatches
                find() {
                    return {
                        limit() {
                            return {
                                async forEach(fn) {
                                    (mockBatch ? [mockBatch] : []).forEach(fn);
                                }
                            }
                        }
                    };
                },
                // used in findMessages
                async findOne() {
                    return {
                        messages: mockMessages
                    };
                },
                // used in storeDlqMessages/storeRetryMessages/storeSuccessMessages
                async insertOne(messages) {
                    return messages;
                },
                // used in deleteBatch
                async deleteOne({ activationId }) {
                    return { activationId };
                }
            };
        }
        getCollection.instances = { MESSAGES: 'MESSAGE-INSTANCE' };
        return getCollection;
    });
    
    jest.mock('request-promise', function() {
        return async function() {
            return mockActivationInfo;
        };
    });
}

describe('resolveMessagesLogs', function() {
    beforeEach(() => {
        jest.resetModules();
    });

    it('handles empty unresolved batches', async function() {
        mockModules({});
        const resolveMessagesLogs = require('../index');
        expect(await resolveMessagesLogs({
            collectionName: 'empty'
        })).toEqual({
            counts: {
                failedToResolve: 0,
                successfullyResolved: 0
            },
            resolveBatchesResult: []
        });
    });

    it('returns retry for a batch with no activation info', async function() {
        const mockBatch = {
            activationId: 'some-activationId'
        };
        const mockActivationInfo = {
            response: {
              body: {
                error: 'some-error'
              }
            }
        };
        const mockMessage = {
            id: 'some-message',
            value: {
                id: 'some-id'
            }
        };
        mockModules({ mockBatch, mockActivationInfo, mockMessages: [mockMessage] });
        const resolveMessagesLogs = require('../index');
        expect(await resolveMessagesLogs({})).toEqual({
            counts: {
                failedToResolve: 0,
                successfullyResolved: 1
            },
            resolveBatchesResult: [{
                batch: mockBatch,
                resolved: true,
                dlqed: 0,
                retried: 1,
                success: 0
            }]
        });
    });

    it('returns retry for a batch with no response for activation info', async function() {
        const mockBatch = {
            activationId: 'some-activationId'
        };
        const mockMessage = {
            id: 'some-message',
            value: {
                id: 'some-id'
            }
        };
        mockModules({ mockBatch, mockMessages: [mockMessage] });
        const resolveMessagesLogs = require('../index');
        expect(await resolveMessagesLogs({})).toEqual({
            counts: {
                failedToResolve: 0,
                successfullyResolved: 1
            },
            resolveBatchesResult: [{
                batch: mockBatch,
                resolved: true,
                dlqed: 0,
                retried: 1,
                success: 0
            }]
        });
    });

    it('returns empty dlq and retry for a successful batch', async function() {
        const mockBatch = {
            activationId: 'some-activationId'
        };
        const mockActivationInfo = {
            response: {
                success: true
            }
        };
        const mockMessage = {
            id: 'some-message',
            value: {
                id: 'some-id'
            }
        };
        mockModules({ mockBatch, mockActivationInfo, mockMessages: [mockMessage] });
        const resolveMessagesLogs = require('../index');
        expect(await resolveMessagesLogs({})).toEqual({
            counts: {
                failedToResolve: 0,
                successfullyResolved: 1
            },
            resolveBatchesResult: [{
                batch: mockBatch,
                resolved: true,
                dlqed: 0,
                retried: 0,
                success: 1
            }]
        });
    });

    it('returns a retry message for a failed batch that has a message that has not been retried at all', async function() {
        const mockBatch = {
            activationId: 'some-activationId'
        };
        const mockActivationInfo = {
            annotations: [{
                key: 'timeout',
                value: false
            }],
            response: {
                success: false
            }
        };
        const mockMessage = {
            id: 'some-message',
            value: {
                id: 'some-id'
            }
        };
        mockModules({ mockBatch, mockActivationInfo, mockMessages: [mockMessage] });
        const resolveMessagesLogs = require('../index');
        expect(await resolveMessagesLogs({})).toEqual({
            counts: {
                successfullyResolved: 1,
                failedToResolve: 0
            },
            resolveBatchesResult: [{
                batch: mockBatch,
                resolved: true,
                retried: 1,
                success: 0,
                dlqed: 0
            }]
        });
    });

    it('returns a dlq message for a failed batch that has a message that has exceeded maximum retries', async function() {
        const mockBatch = {
            activationId: 'some-activationId'
        };
        const mockActivationInfo = {
            annotations: [{
                key: 'timeout',
                value: false
            }],
            response: {
                success: false
            }
        };
        const mockMessage = {
            id: 'some-message',
            value: {
                id: 'some-id',
                metadata: {
                    lastRetry: 0,
                    nextRetry: 0,
                    retries: MAX_RETRIES
                }
            }
        };
        mockModules({ mockBatch, mockActivationInfo, mockMessages: [mockMessage] });
        const resolveMessagesLogs = require('../index');
        expect(await resolveMessagesLogs({})).toEqual({
            counts: {
                successfullyResolved: 1,
                failedToResolve: 0
            },
            resolveBatchesResult: [{
                batch: mockBatch,
                resolved: true,
                retried: 0,
                success: 0,
                dlqed: 1
            }]
        });
    });

    it('returns a dlq message for a batch with no activation info that has a message that has exceeded maximum retries', async function() {
        const mockBatch = {
            activationId: 'some-activationId'
        };
        const mockActivationInfo = {
            response: {
              body: {
                error: 'some-error'
              }
            }
        };
        const mockMessage = {
            id: 'some-message',
            value: {
                id: 'some-id',
                metadata: {
                    lastRetry: 0,
                    nextRetry: 0,
                    retries: MAX_RETRIES
                }
            }
        };
        mockModules({ mockBatch, mockActivationInfo, mockMessages: [mockMessage] });
        const resolveMessagesLogs = require('../index');
        expect(await resolveMessagesLogs({})).toEqual({
            counts: {
                successfullyResolved: 1,
                failedToResolve: 0
            },
            resolveBatchesResult: [{
                batch: mockBatch,
                resolved: true,
                retried: 0,
                success: 0,
                dlqed: 1
            }]
        });
    });

    it('returns a dlq message for a batch with no response for activation info that has a message that has exceeded maximum retries', async function() {
        const mockBatch = {
            activationId: 'some-activationId'
        };
        const mockMessage = {
            id: 'some-message',
            value: {
                id: 'some-id',
                metadata: {
                    lastRetry: 0,
                    nextRetry: 0,
                    retries: MAX_RETRIES
                }
            }
        };
        mockModules({ mockBatch, mockMessages: [mockMessage] });
        const resolveMessagesLogs = require('../index');
        expect(await resolveMessagesLogs({})).toEqual({
            counts: {
                successfullyResolved: 1,
                failedToResolve: 0
            },
            resolveBatchesResult: [{
                batch: mockBatch,
                resolved: true,
                retried: 0,
                success: 0,
                dlqed: 1
            }]
        });
    });

    it('returns a retry message for a batch with partial failure even if batch is successful', async function() {
        const mockBatch = {
            activationId: 'some-activationId',
            failureIndexes: [0]
        };
        const mockActivationInfo = {
            annotations: [{
                key: 'timeout',
                value: false
            }],
            response: {
                success: true
            },
            end: 0
        };
        const mockMessage = {
            id: 'some-message',
            value: {
                id: 'some-id',
                metadata: {
                    lastRetry: 0,
                    nextRetry: 0,
                    retries: 0
                }
            }
        };
        mockModules({ mockBatch, mockActivationInfo, mockMessages: [mockMessage] });
        const resolveMessagesLogs = require('../index');
        expect(await resolveMessagesLogs({})).toEqual({
            counts: {
                successfullyResolved: 1,
                failedToResolve: 0
            },
            resolveBatchesResult: [{
                batch: mockBatch,
                retried: 1,
                success: 0,
                dlqed: 0,
                resolved: true
            }]
        });
    });

    it('returns a success message and retry for a batch with partial failure even if batch is successful', async function() {
        const mockBatch = {
            activationId: 'some-activationId',
            failureIndexes: [1]
        };
        const mockActivationInfo = {
            annotations: [{
                key: 'timeout',
                value: false
            }],
            response: {
                success: true
            },
            end: 0
        };
        const mockMessage = {
            id: 'some-message',
            value: {
                id: 'some-id',
                metadata: {
                    lastRetry: 0,
                    nextRetry: 0,
                    retries: 0
                }
            }
        };
        mockModules({ mockBatch, mockActivationInfo, mockMessages: [{...mockMessage, id: 'some-message2', value: { ...mockMessage.value, id: 'some-id2' } }, mockMessage] });
        const resolveMessagesLogs = require('../index');
        expect(await resolveMessagesLogs({})).toEqual({
            counts: {
                successfullyResolved: 1,
                failedToResolve: 0
            },
            resolveBatchesResult: [{
                batch: mockBatch,
                retried: 1,
                success: 1,
                dlqed: 0,
                resolved: true
            }]
        });
    });

    it('returns all of the messages for a batch with partial failure, ignoring partial failure info', async function() {
        const mockBatch = {
            activationId: 'some-activationId',
            failureIndexes: [0]
        };
        const mockActivationInfo = {
            annotations: [{
                key: 'timeout',
                value: false
            }],
            response: {
                success: false
            },
            end: 0
        };
        const mockMessage = {
            id: 'some-message',
            value: {
                id: 'some-id',
                metadata: {
                    lastRetry: 0,
                    nextRetry: 0,
                    retries: 0
                }
            }
        };
        mockModules({ mockBatch, mockActivationInfo, mockMessages: [mockMessage, mockMessage] });
        const resolveMessagesLogs = require('../index');
        expect(await resolveMessagesLogs({})).toEqual({
            counts: {
                // Note: this is batch count not message count; a batch is either completely handled or it fails
                successfullyResolved: 1,
                failedToResolve: 0
            },
            resolveBatchesResult: [{
                batch: mockBatch,
                retried: 2,
                dlqed: 0,
                resolved: true,
                success: 0
            }]
        });
    });

    it('returns dlq message for a batch with partial failure that has been retried more than the limit', async function() {
        const mockBatch = {
            activationId: 'some-activationId',
            failureIndexes: [0]
        };
        const mockActivationInfo = {
            annotations: [{
                key: 'timeout',
                value: false
            }],
            response: {
                success: true
            },
            end: 0
        };
        const mockMessage = {
            id: 'some-message',
            value: {
                id: 'some-id',
                metadata: {
                    lastRetry: 0,
                    nextRetry: 0,
                    retries: MAX_RETRIES
                }
            }
        };
        mockModules({ mockBatch, mockActivationInfo, mockMessages: [mockMessage] });
        const resolveMessagesLogs = require('../index');
        expect(await resolveMessagesLogs({})).toEqual({
            counts: {
                failedToResolve: 0,
                successfullyResolved: 1
            },
            resolveBatchesResult: [{
                resolved: true,
                dlqed: 1,
                retried: 0,
                batch: mockBatch,
                success: 0
            }]
        });
    });

    it('returns dlq message and success message for a batch with partial failure that has been retried more than the limit', async function() {
        const mockBatch = {
            activationId: 'some-activationId',
            failureIndexes: [1]
        };
        const mockActivationInfo = {
            annotations: [{
                key: 'timeout',
                value: false
            }],
            response: {
                success: true
            },
            end: 0
        };
        const mockMessage = {
            id: 'some-message',
            value: {
                id: 'some-id',
                metadata: {
                    lastRetry: 0,
                    nextRetry: 0,
                    retries: MAX_RETRIES
                }
            }
        };
        mockModules({ mockBatch, mockActivationInfo, mockMessages: [mockMessage, mockMessage] });
        const resolveMessagesLogs = require('../index');
        expect(await resolveMessagesLogs({})).toEqual({
            counts: {
                failedToResolve: 0,
                successfullyResolved: 1
            },
            resolveBatchesResult: [{
                resolved: true,
                dlqed: 1,
                retried: 0,
                batch: mockBatch,
                success: 1
            }]
        });
    });
});
