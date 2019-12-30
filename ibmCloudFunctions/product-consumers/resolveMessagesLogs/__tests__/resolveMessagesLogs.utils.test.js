const { groupMessagesByNextAction } = require('../utils');

describe('groupMessagesByNextAction', function() {
    const activationEndTime  = 0;

    describe('getValueWithUpdatedMetadata', function() {
        const getValueWithUpdatedMetadata = groupMessagesByNextAction.getValueWithUpdatedMetadata;
        it('updates a value with no metadata', function() {
            const value = {};
            const valueWithMetadata = getValueWithUpdatedMetadata(value, activationEndTime);
            expect(valueWithMetadata).toEqual({
                metadata: {
                    lastRetry: 0,
                    nextRetry: 0,
                    retries: 0
                }
            });
        });
        it('preserves metadata fields on a value', function() {
            const value = {
                metadata: {
                    someField: 'someField'
                }
            };
            const valueWithMetadata = getValueWithUpdatedMetadata(value, activationEndTime);
            expect(valueWithMetadata).toEqual({
                metadata: {
                    lastRetry: 0,
                    nextRetry: 0,
                    retries: 0,
                    someField: 'someField'
                }
            });
        });
        it('Sets next retry fields on a value based on retries', function() {
            const value = {
                metadata: {
                    retries: 1,
                }
            };
            const valueWithMetadata = getValueWithUpdatedMetadata(value, activationEndTime);
            expect(valueWithMetadata).toEqual({
                metadata: {
                    lastRetry: 0,
                    nextRetry: 0 + 10 * 60 * 1000, // activationEndTime + INTERVAL_PER_RETRY
                    retries: 1
                }
            });
        });
    });

    it("groups messages that has been retried more than MAX_RETRIES into dlq", function() {
        const dlqMessages = {
            id: 'dlqValue',
            value: {
                metadata: {
                    retries: 24
                }
            }
        };
        expect(groupMessagesByNextAction([dlqMessages], activationEndTime)).toEqual({
            retry: [],
            dlq: [dlqMessages]
        })
    });
    it("groups messages that has been retried less  han MAX_RETRIES into retry and update their metadata", function() {
        const retryMessage = {
            id: 'retryValue',
            value: {
                metadata: {
                    retries: 23,
                }
            }
        };
        expect(groupMessagesByNextAction([retryMessage], activationEndTime)).toEqual({
            retry: [{
                id: 'retryValue',
                value: {
                    metadata: {
                        lastRetry: 0,
                        retries: 23,
                        nextRetry: 23 * 10 * 60 * 1000
                    }
                } 
            }],
            dlq: []
        })
    });
});
