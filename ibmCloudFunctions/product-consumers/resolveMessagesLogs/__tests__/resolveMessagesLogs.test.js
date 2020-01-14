// Note: only parameters starting with `mock` are allowed
// https://github.com/facebook/jest/blob/116303baf711df37304986897582eb8078aa24d8/packages/babel-plugin-jest-hoist/src/index.ts#L17
function mockModules({
    mockBatch,
    mockActivationInfo,
    mockMessage
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
                        messages: [mockMessage]
                    };
                },
                // used in storeDlqMessages/storeRetryMessages
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
            resolveBatchesResult: [],
            unresolvedBatches: []
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
        mockModules({ mockBatch, mockActivationInfo });
        const resolveMessagesLogs = require('../index');
        expect(await resolveMessagesLogs({})).toEqual({
            resolveBatchesResult: [{
                activationId: mockBatch.activationId,
                activationInfo: mockActivationInfo,
                messagesByNextAction: {
                    dlq: [],
                    retry: []
                },
                deleteBatchResult: { ...mockBatch },
                storeMessagesByNextActionResult: {
                    dlq: null,
                    retry: null
                }
            }],
            unresolvedBatches: [mockBatch]
        });
    });

    it('returns a dlq message for a failed batch that is not timedout', async function() {
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
        mockModules({ mockBatch, mockActivationInfo, mockMessage });
        const resolveMessagesLogs = require('../index');
        expect(await resolveMessagesLogs({})).toEqual({
            resolveBatchesResult: [{
                activationId: mockBatch.activationId,
                activationInfo: mockActivationInfo,
                messagesByNextAction: {
                    dlq: [mockMessage],
                    retry: []
                },
                deleteBatchResult: { ...mockBatch },
                storeMessagesByNextActionResult: {
                    dlq: {
                        metadata: { activationInfo: mockActivationInfo },
                        messages: [mockMessage]
                    },
                    retry: null
                }
            }],
            unresolvedBatches: [{
                ...mockBatch
            }]
        });
    });

    it('returns a retry message for a failed batch that is timedout', async function() {
        const mockBatch = {
            activationId: 'some-activationId',
        };
        const mockActivationInfo = {
            annotations: [{
                key: 'timeout',
                value: true
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
        mockModules({ mockBatch, mockActivationInfo, mockMessage });
        const resolveMessagesLogs = require('../index');
        expect(await resolveMessagesLogs({})).toEqual({
            resolveBatchesResult: [{
                activationId: mockBatch.activationId,
                activationInfo: mockActivationInfo,
                messagesByNextAction: {
                    dlq: [],
                    retry: [mockMessage]
                },
                deleteBatchResult: { ...mockBatch },
                storeMessagesByNextActionResult: {
                    dlq: null,
                    retry: {
                        metadata: { activationInfo: mockActivationInfo },
                        messages: [mockMessage]
                    }
                }
            }],
            unresolvedBatches: [{
                ...mockBatch
            }]
        });
    });
});
