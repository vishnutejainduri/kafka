const { groupMessagesByNextAction, INTERVAL_GROWTH_RATE, MAX_RETRIES  } = require('../utils');

function validateNextRetry(nextRetry, activationEndTime = 0, retries = 0) {
    expect(
        nextRetry > activationEndTime + INTERVAL_GROWTH_RATE * Math.pow(3, retries)
        && nextRetry < activationEndTime + INTERVAL_GROWTH_RATE * Math.pow(3, retries) * 2
    ).toEqual(true);
}

describe('groupMessagesByNextAction', function() {
    const activationEndTime  = 0;

    describe('getValueWithUpdatedMetadata', function() {
        const getValueWithUpdatedMetadata = groupMessagesByNextAction.getValueWithUpdatedMetadata;
        it('updates a value with no metadata', function() {
            const value = {};
            const valueWithMetadata = getValueWithUpdatedMetadata(value, activationEndTime);
            expect(valueWithMetadata.metadata).toMatchObject({
                lastRetry: 0,
                retries: 0
            });
            validateNextRetry(valueWithMetadata.metadata.nextRetry);
        });
        it('preserves metadata fields on a value', function() {
            const value = {
                metadata: {
                    someField: 'someField'
                }
            };
            const valueWithMetadata = getValueWithUpdatedMetadata(value, activationEndTime);
            expect(valueWithMetadata.metadata).toMatchObject({
                lastRetry: 0,
                retries: 0,
                someField: 'someField'
            });
            validateNextRetry(valueWithMetadata.metadata.nextRetry);
        });
        it('Sets next retry fields on a value based on retries', function() {
            const value = {
                metadata: {
                    retries: 1,
                }
            };
            const activationEndTime = 1000;
            const valueWithMetadata = getValueWithUpdatedMetadata(value,activationEndTime);
            expect(valueWithMetadata.metadata).toMatchObject({
                lastRetry: activationEndTime,
                retries: 1
            });
            validateNextRetry(valueWithMetadata.metadata.nextRetry,activationEndTime,1);
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
        const groupedMessages = groupMessagesByNextAction([retryMessage],activationEndTime);
        expect(groupedMessages).toMatchObject({
            retry: [{
                id: 'retryValue',
                value: {
                    metadata: {
                        lastRetry: 0,
                        retries: retries
                    }
                }
            }],
            dlq: []
        });
        validateNextRetry(groupedMessages.retry[0].value.metadata.nextRetry,0,retries);
    });
    it("groups messages that has been retried less  than the default maxRetries into retry and update their metadata, set activationEndTime to current time if doesn't exist", function() {
        const retries =  MAX_RETRIES - 1;
        const retryMessage = {
            id: 'retryValue',
            value: {
                metadata: {
                    retries,
                }
            }
        };
        const groupedMessages = groupMessagesByNextAction([retryMessage]);
        expect(groupedMessages.dlq).toMatchObject([]);
        expect(groupedMessages.retry[0].value.metadata.lastRetry).toBeGreaterThan(0);
        expect(groupedMessages.retry[0].value.metadata.retries).toEqual(retries);
        validateNextRetry(groupedMessages.retry[0].value.metadata.nextRetry,groupedMessages.retry[0].value.metadata.lastRetry,retries);
    });
});
