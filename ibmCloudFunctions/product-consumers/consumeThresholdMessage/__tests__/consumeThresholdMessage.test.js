const consumeThresholdMessage = require('../');

jest.mock("mongodb");

const params = {
    topicName: 'thresholds-connect-jdbc',
    messages: [
        {
            topic: 'thresholds-connect-jdbc',
            value: {
                'SKU_ID': 'skuId',
                'THRESHOLD': 'Aw==',
                'LAST_MOD_DATE': 1000000000000,
            }
        },
        {
            topic: 'thresholds-connect-jdbc',
            value: {
                'SKU_ID': 'skuId',
                'THRESHOLD': 'Aw==',
                'LAST_MOD_DATE': 1000000000000,
            }
        },
        {
            topic: 'thresholds-connect-jdbc',
            value: {
                'SKU_ID': 'skuId',
                'THRESHOLD': 'Aw==',
                'LAST_MOD_DATE': 1000000000000,
            }
        }
    ],
    mongoUri: 'mongo-uri',
    dbName: 'db-name',
    mongoCertificateBase64: 'mong-certificate',
    collectionName: 'skus',
    stylesCollectionName: 'styles',
    styleAvailabilityCheckQueue: 'styleAvailabilityCheckQueue',
}

describe('consumeThresholdMessage', () => {
    it('missing all parameters; should fail', async () => {
        expect((await consumeThresholdMessage({})).error).toBeTruthy();
    });
    const resultWithNoErrors = {
        errors: [],
        failureIndexes: [],
        shouldSkipResolvingOffsets: 1
    }
    it('correct message', async () => {
        const response = await consumeThresholdMessage(params);
        // returns nothing/undefined if successfully run
        expect(response).toEqual(resultWithNoErrors);
    });
    it('correct message; large threshold', async () => {
        params.messages[0].value.THRESHOLD = 'AfQ=';
        const response = await consumeThresholdMessage(params);
        // returns nothing/undefined if successfully run
        expect(response).toEqual(resultWithNoErrors);
    });
    it('correct message; threshold is actually integer', async () => {
        params.messages[0].value.THRESHOLD = 3;
        const response = await consumeThresholdMessage(params);
        // returns nothing/undefined if successfully run
        expect(response).toEqual(resultWithNoErrors);
    });
    it('handles partial failure', async () => {
        params.messages[1].topic = null;
        const response = await consumeThresholdMessage(params);
        // returns nothing/undefined if successfully run
        expect(response.failureIndexes.includes(1)).toEqual(true);
    });
});
