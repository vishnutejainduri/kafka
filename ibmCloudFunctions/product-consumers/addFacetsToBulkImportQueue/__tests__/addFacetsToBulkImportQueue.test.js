const addFacetsToBulkImportQueue = require('../index');

jest.mock('../../../lib/storeMessages');
const storeMessages = require('../../../lib/storeMessages');

describe('addFacetsToBulkImportQueue', function() {
    const params = {
        mongoUri: 'mongo-uri',
        mongoCertificateBase64: 'mongo-certificate-64',
        collectionName: 'collection-name',
        dbName: 'db-name',
        messages: []
    };
    it('Returns result if all required params are passed', async function() {
        expect((await addFacetsToBulkImportQueue(params)).results.length).toBe(0);
    });
    it('Calls storeMessages with params and messages', async function() {
        expect(storeMessages).toBeCalledWith(
            { ...params, mongoUri: params.messagesMongoUri },
            { activationId: undefined, messages: [] }
        );
    });
});
