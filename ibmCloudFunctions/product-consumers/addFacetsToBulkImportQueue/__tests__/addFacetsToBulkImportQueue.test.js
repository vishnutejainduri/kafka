const addFacetsToBulkImportQueue = require('../index');

describe('addFacetsToBulkImportQueue', () => {
    it('will throw if the parameters are not provided', async () => {
        let response = null;
        await addFacetsToBulkImportQueue().catch(error => { response = error});
        expect(response instanceof Error).toBe(true);
    });

    it('will succeed if all of the parameters are provided', async () => {
        const params = {
            messages: [{
                value: 'some-value',
            }],
            mongoUri: 'mongo-uri',
            dbName: 'db-name',
            collectionName: 'collection-name',
            mongoCertificateBase64: 'mong-certificate'
        }
        const response = await addFacetsToBulkImportQueue(params);
        expect(response).toBeTruthy();
    });
});
