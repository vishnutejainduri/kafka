const updateAlgoliaInventory = require('../');

jest.mock("mongodb");
jest.mock("algoliasearch");
jest.mock("request-promise");

describe('updateAlgoliaInventory', () => {
    it('missing all parameters; should fail', async () => {
        let response = null;
        await updateAlgoliaInventory().catch(error => { response = error});
        expect(response instanceof Error).toBe(true);
    });
    it('correct message', async () => {
        const params = {
            algoliaIndexName: 'index-name',
            algoliaApiKey: 'api-key',
            algoliaAppId: 'app-id',
            productApiClientId: 'product-api-client-id',
            productApiHost: 'product-api-host', 
            mongoUri: 'mongo-uri',
            dbName: 'db-name',
            mongoCertificateBase64: 'mong-certificate',
            collectionName: 'styleAvailabilityCheckQueue',
            stylesCollectionName: 'styles',
            styleAvailabilityCheckQueue: 'styleAvailabilityCheckQueue'
        }
        let response = null;
        await updateAlgoliaInventory(params);
        // returns nothing/undefined if successfully run
        expect(response).toEqual(null);
    });
});
