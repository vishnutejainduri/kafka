const { groupMessagesByNextAction, INTERVAL_GROWTH_RATE, MAX_RETRIES  } = require('../utils');

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
                    nextRetry: INTERVAL_GROWTH_RATE,
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
                    nextRetry: INTERVAL_GROWTH_RATE,
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
            const activationEndTime = 1000;
            const valueWithMetadata = getValueWithUpdatedMetadata(value, activationEndTime);
            expect(valueWithMetadata).toEqual({
                metadata: {
                    lastRetry: activationEndTime,
                    nextRetry: activationEndTime + Math.pow(2, 1) * INTERVAL_GROWTH_RATE, // activationEndTime + INTERVAL_GROWTH_RATE
                    retries: 1
                }
            });
        });
    });

    it("groups messages that has been retried more than the default maxRetries into dlq", function() {
      const retries = MAX_RETRIES;
        const dlqMessages = {
            id: 'dlqValue',
            value: {
                metadata: {
                    retries
                }
            }
        };
        expect(groupMessagesByNextAction([dlqMessages], activationEndTime)).toEqual({
            retry: [],
            dlq: [dlqMessages]
        })
    });
    it("groups messages that has been retried more than a specified maxRetries into dlq", function() {
        const maxRetries = 2;
        const retries = maxRetries;
          const dlqMessages = {
              id: 'dlqValue',
              value: {
                  metadata: {
                      retries
                  }
              }
          };
          expect(groupMessagesByNextAction([dlqMessages], activationEndTime, maxRetries)).toEqual({
              retry: [],
              dlq: [dlqMessages]
          })
      });
    it("groups messages that has been retried less  than the default maxRetries into retry and update their metadata", function() {
        const retries =  MAX_RETRIES - 1;
        const retryMessage = {
            id: 'retryValue',
            value: {
                metadata: {
                    retries,
                }
            }
        };
        expect(groupMessagesByNextAction([retryMessage], activationEndTime)).toEqual({
            retry: [{
                id: 'retryValue',
                value: {
                    metadata: {
                        lastRetry: 0,
                        retries: retries,
                        nextRetry: Math.pow(2, retries) * INTERVAL_GROWTH_RATE
                    }
                }
            }],
            dlq: []
        })
    });
});
