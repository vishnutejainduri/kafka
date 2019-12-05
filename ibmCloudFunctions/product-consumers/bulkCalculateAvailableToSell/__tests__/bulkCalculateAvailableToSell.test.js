const bulkCalculateAvailableToSell = require('../');

jest.mock("mongodb");

describe('bulkCalculateAvailableToSell', () => {
    it('missing all parameters; should fail', async () => {
        await expect(bulkCalculateAvailableToSell({})).rejects.toThrow();
    });
    it('valid message', async () => {
        const params = {
            mongoUri: 'mongo-uri',
            dbName: 'db-name',
            mongoCertificateBase64: 'mong-certificate',
            collectionName: 'bulkAtsRecalculateQueue',
            styleAvailabilityCheckQueue: 'styleAvailabilityCheckQueue',
            stylesCollectionName: 'styles',
            skusCollectionName: 'skus',
            storesCollectionName: 'stores',
            inventoryCollectionName: 'inventory'
        }
        let response = null;
        await bulkCalculateAvailableToSell(params);
        // returns nothing/undefined if successfully run
        console.log('response',response);
        expect(response).toEqual(null);
    });
});
