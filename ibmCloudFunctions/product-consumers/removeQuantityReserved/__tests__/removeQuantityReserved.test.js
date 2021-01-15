const removeQuantityReserved = require('../');

const params = {
    mongoUri: 'mongo-uri',
    dbName: 'db-name',
    mongoCertificateBase64: 'mong-certificate',
    collectionName: 'skus'
};

describe('removeQuantityReserved', () => {
    it('returns an object that has `error` attribute when given an invalid argument', async () => {
        const invalidArgument = {};
        expect((await removeQuantityReserved(invalidArgument)).errorResult).toBeDefined();
    });

    it('returns an object with `shouldResolveOffsets` set to 1 when given a valid argument', async () => {
        const response = await removeQuantityReserved(params);
        expect(response).toEqual({
            shouldResolveOffsets: 1
        });
    });
});
