const addFacetsToBulkImportQueue = require('../index');

jest.mock('../../../lib/messagesLogs');

describe('addFacetsToBulkImportQueue', function() {
    const params = {
        mongoUri: 'mongo-uri',
        messagesMongoUri: 'messages-mongo-uri',
        mongoCertificateBase64: 'mongo-certificate-64',
        collectionName: 'collection-name',
        dbName: 'db-name',
        messages: [{
            value: {
                CATEGORY: ''
            }
        }]
    };
    it('Returns success if all required params are passed', async function() {
        expect((await addFacetsToBulkImportQueue(params))).toEqual({
            successCount: 1,
            failureIndexes: [],
            errors: [],
            shouldResolveOffsets: 1
        });
    });
});
