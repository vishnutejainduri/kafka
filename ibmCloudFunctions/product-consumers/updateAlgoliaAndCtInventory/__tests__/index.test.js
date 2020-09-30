const updateAlgoliaAndCtInventory = require('../');

jest.mock("mongodb");
jest.mock("algoliasearch");
jest.mock("request-promise");

describe('updateAlgoliaAndCtInventory', () => {
    it('missing all parameters; should fail', async () => {
        await expect(updateAlgoliaAndCtInventory({})).rejects.toThrow();
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
            styleAvailabilityCheckQueue: 'styleAvailabilityCheckQueue',
            ctpProjectKey: 'harryrosen-dev',
            ctpClientId: 'ctClientId',
            ctpClientSecret: 'ceClientSecret',
            ctpAuthUrl: 'https://auth.us-central1.gcp.commercetools.com',
            ctpApiUrl: 'https://api.us-central1.gcp.commercetools.com',
            ctpScopes: 'ctpScopes' 
        }
        const response = await updateAlgoliaAndCtInventory(params);
        expect(response).toEqual({ failureCount: 0, successCount: 0 });
    });
});
