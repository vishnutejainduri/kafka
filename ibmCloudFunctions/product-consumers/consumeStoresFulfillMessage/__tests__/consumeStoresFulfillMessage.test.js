const consumeStoresFulfillMessage = require('../');

jest.mock("mongodb");

describe('consumeStoresFulfillMessage', () => {
    it('missing all parameters; should fail', async () => {
        await expect(consumeStoresFulfillMessage({})).rejects.toThrow();
    });
    it('correct message', async () => {
        const params = {
            topicName: 'stores-fulfill-connect-jdbc',
            messages: [{
                topic: 'stores-fulfill-connect-jdbc',
                value: {
                    SITE_ID: 'siteId',
                    FULFILL_STATUS: 'Y',
                    LAST_MODIFIED: 1000000000000
                },
            }],
            mongoUri: 'mongo-uri',
            dbName: 'db-name',
            mongoCertificateBase64: 'mong-certificate',
            collectionName: 'stores',
            inventoryCollectionName: 'inventory',
            bulkAtsRecalculateQueue: 'bulkAtsRecalculateQueue' 
        }
        const response = await consumeStoresFulfillMessage(params);
        // returns nothing/undefined if successfully run
        expect(response).toEqual(undefined);
    });
});
