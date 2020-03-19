const consumeThresholdMessage = require('../');

jest.mock("mongodb");

const params = {
    topicName: 'thresholds-connect-jdbc',
    messages: [{
        topic: 'thresholds-connect-jdbc',
        value: {
            'SKU_ID': 'skuId',
            'THRESHOLD': 'Aw==',
            'LAST_MOD_DATE': 1000000000000,
          }
    }],
    mongoUri: 'mongo-uri',
    dbName: 'db-name',
    mongoCertificateBase64: 'mong-certificate',
    collectionName: 'skus',
    stylesCollectionName: 'styles',
    styleAvailabilityCheckQueue: 'styleAvailabilityCheckQueue',
}

describe('consumeThresholdMessage', () => {
    it('missing all parameters; should fail', async () => {
        await expect(consumeThresholdMessage({})).rejects.toThrow();
    });
    it('correct message', async () => {
        const response = await consumeThresholdMessage(params);
        // returns nothing/undefined if successfully run
        expect(response).toEqual(undefined);
    });
    it('correct message; large threshold', async () => {
        params.messages[0].value.THRESHOLD = 'AfQ=';
        const response = await consumeThresholdMessage(params);
        // returns nothing/undefined if successfully run
        expect(response).toEqual(undefined);
    });
});
