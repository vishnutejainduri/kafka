const consumeDep27FulfillMessage = require('../');

jest.mock("mongodb");

describe('consumeDep27FulfillMessage', () => {
    it('missing all parameters; should fail', async () => {
        expect((await consumeDep27FulfillMessage({})).error instanceof Error).toBe(true);
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
