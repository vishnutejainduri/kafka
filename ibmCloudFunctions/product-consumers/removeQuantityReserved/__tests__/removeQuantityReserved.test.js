const removeQuantityReserved = require('../');

const params = {
    mongoUri: 'mongo-uri',
    dbName: 'db-name',
    mongoCertificateBase64: 'mong-certificate',
    collectionName: 'skus'
};

describe('removeQuantityReserved', () => {
    it('missing all parameters; should fail', async () => {
        await expect(removeQuantityReserved({})).rejects.toThrow();
    });
    it('correct message', async () => {
        const response = await removeQuantityReserved(params);
        // returns nothing/undefined if successfully run
        expect(response).toBe(undefined);
    });
});
