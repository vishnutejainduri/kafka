const consumeDep27FulfillMessage = require('../');
const { mongodb } = require('../../mocks');

jest.mock("mongodb");

describe('consumeDep27FulfillMessage', () => {
    it('missing all parameters', async () => {
        let response = null;
        await consumeDep27FulfillMessage().catch(error => { response = error});
        expect(response instanceof Error).toBe(true);
    });
    /*it('correct message', async () => {
        const params = {
            messages: [{
                value: {
                    STYLEID: 'styleId',
                    CATEGORY: 'Category'
                },
            }],
            mongoUri: 'mongo-uri',
            dbName: 'db-name',
            mongoCertificateBase64: 'mong-certificate',
            collectionName: 'addFacetsToBulkImportQueue'
        }
        const response = await addFacetsToBulkImportQueue(params).catch(console.log);
        expect(response).toEqual([{ _id: 'styleIdstyle' }]);
    });*/
});
