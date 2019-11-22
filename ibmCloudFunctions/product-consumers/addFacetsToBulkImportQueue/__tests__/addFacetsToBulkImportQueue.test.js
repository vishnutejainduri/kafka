const addFacetsToBulkImportQueue = require('../');

jest.mock("mongodb");

describe('addFacetsToBulkImportQueue', () => {
    it('will throw if the requires parameters are not provided', async () => {
        let response = null;
        await addFacetsToBulkImportQueue({}).catch(error => { response = error});
        expect(response instanceof Error).toBe(true);
    });

    it('will succeed if all of the parameters are provided', async () => {
        const params = {
            messages: [{
                value: {
                    STYLEID: 'styleId',
                    CATEGORY: 'Category',
                    DESC_ENG: 'eng-desc'
                },
            }],
            mongoUri: 'mongo-uri',
            dbName: 'db-name',
            mongoCertificateBase64: 'mong-certificate',
            collectionName: 'addFacetsToBulkImportQueue'
        }
        const response = await addFacetsToBulkImportQueue(params);
        expect(response.results).toEqual([{ _id: 'styleIdstyle' }]);
    });
});
