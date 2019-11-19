const consumeDep27FulfillMessage = require('../');
const mongodb = require('../../__mocks__/mongodb');

jest.mock("mongodb");

describe('consumeDep27FulfillMessage', () => {
    it('missing all parameters; should fail', async () => {
        let response = null;
        await consumeDep27FulfillMessage().catch(error => { response = error});
        expect(response instanceof Error).toBe(true);
    });
    it('correct message', async () => {
        const params = {
            topicName: 'stores-dep27fulfill-connect-jdbc',
            messages: [{
                topic: 'stores-dep27fulfill-connect-jdbc',
                value: {
                    SITE_ID: 'siteId',
                    FULFILL_STATUS: 'fulfillStatus',
                    MODIFIEDDATE: 1000000000000
                },
            }],
            mongoUri: 'mongo-uri',
            dbName: 'db-name',
            mongoCertificateBase64: 'mong-certificate',
            collectionName: 'stores'
        }
        const response = await consumeDep27FulfillMessage(params);
        // returns nothing/undefined if successfully run
        expect(response).toEqual(undefined);
    });
});
