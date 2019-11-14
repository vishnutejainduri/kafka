const consumeStoresFulfillMessage = require('../');
const mongodb = require('../../__mocks__/mongodb');

jest.mock("mongodb");

describe('consumeStoresFulfillMessage', () => {
    it('missing all parameters', async () => {
        let response = null;
        await consumeStoresFulfillMessage().catch(error => { response = error});
        expect(response instanceof Error).toBe(true);
    });
    it('correct message', async () => {
        const params = {
            topicName: 'stores-fulfill-connect-jdbc',
            messages: [{
                topic: 'stores-fulfill-connect-jdbc',
                value: {
                    SITE_ID: 'siteId',
                    FULFILL_STATUS: 'fulfillStatus',
                    LAST_MODIFIED: 1000000000000
                },
            }],
            mongoUri: 'mongo-uri',
            dbName: 'db-name',
            mongoCertificateBase64: 'mong-certificate',
            collectionName: 'stores'
        }
        const response = await consumeStoresFulfillMessage(params).catch(console.log);
        // returns nothing/undefined if successfully run
        expect(response).toEqual(undefined);
    });
});
