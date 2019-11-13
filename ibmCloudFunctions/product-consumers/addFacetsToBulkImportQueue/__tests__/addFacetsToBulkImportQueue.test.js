const addFacetsToBulkImportQueue = require('../');

jest.mock("mongodb");

describe('addFacetsToBulkImportQueue', () => {
    it('will throw if the parameters are not provided', async () => {
        let response = null;
        await addFacetsToBulkImportQueue().catch(error => { response = error});
        expect(response instanceof Error).toBe(true);
    });

    it('will succeed if all of the parameters are provided', async () => {
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
    });
});
