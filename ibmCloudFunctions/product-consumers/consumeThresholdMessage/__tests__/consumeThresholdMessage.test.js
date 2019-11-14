const consumeThresholdMessage = require('../');
const mongodb = require('../../__mocks__/mongodb');

jest.mock("mongodb");

describe('consumeThresholdMessage', () => {
    it('missing all parameters', async () => {
        let response = null;
        await consumeThresholdMessage().catch(error => { response = error});
        expect(response instanceof Error).toBe(true);
    });
    it('correct message', async () => {
        const params = {
            topicName: 'thresholds-connect-jdbc',
            messages: [{
                topic: 'thresholds-connect-jdbc',
                value: {
                    'SKU_ID': 'skuId',
                    'THRESHOLD': 1,
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
        const response = await consumeThresholdMessage(params).catch(console.log);
        // returns nothing/undefined if successfully run
        expect(response).toEqual(undefined);
    });
});
