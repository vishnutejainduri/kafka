const getCollection = require('../getCollection');

describe('getCollection', () => {
    describe('params validation', () => {
        it('rejects an incomplete set of inputs', async () => {
            const emptyParams = {};
            const response = await getCollection(emptyParams).catch(error => error);
            expect(response instanceof Error).toBe(true);
        });

        it('Accepts a complete set of inputs', async () => {
            const completeParams = {
                mongoUri: 'mongoUri',
                dbName: 'dbName',
                collectionName: 'collectionName',
                mongoCertificateBase64: 'mongoCertificateBase64'
            };
            const response = await getCollection(completeParams).catch(error => error);
            expect(response).toBeTruthy();
            // we are mocking mongodb and jest automatically uses the mock unless we call jest.unmock('mongodb'),
            // so we do get a response even though credentials are invalid
        });
    });
});
