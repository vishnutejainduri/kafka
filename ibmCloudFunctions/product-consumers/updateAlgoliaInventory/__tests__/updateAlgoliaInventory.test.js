const updateAlgoliaInventory = require('../');
const mongodb = require('../../__mocks__/mongodb');
const algoliasearch = require('../../__mocks__/algoliasearch');

jest.mock("mongodb");
jest.mock("algoliasearch");

describe('updateAlgoliaInventory', () => {
    it('missing all parameters', async () => {
        let response = null;
        await updateAlgoliaInventory().catch(error => { response = error});
        expect(response instanceof Error).toBe(true);
    });
    it('correct message', async () => {
        const params = {
            algoliaIndexName: 'index-name',
            algoliaApiKey: 'api-key',
            algoliaAppId: 'app-id',
            mongoUri: 'mongo-uri',
            dbName: 'db-name',
            mongoCertificateBase64: 'mong-certificate',
            collectionName: 'styleAvailabilityCheckQueue' 
        }
        const response = await updateAlgoliaInventory(params).catch(console.log);
        console.log(response);
        // returns nothing/undefined if successfully run
        expect(response).toEqual(undefined);
    });
});
