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
                CATEGORY: 'Category',
                CHARACTERISTIC_TYPE_ID: null
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

    it('Returns failure if all invalid facet id mapping provided', async function() {
        const invalidParams = { ...params, messages: [{ ...params.messages[0], value: { ...params.messages[0].value, CATEGORY: 'Micro Site' } }] }
        const result = await addFacetsToBulkImportQueue(invalidParams)
        expect(result.successCount).toEqual(0)
        expect(result.failureIndexes).toEqual([0])
        expect(result.shouldResolveOffsets).toEqual(1)
        expect(result.errors.length).toEqual(1)
    });
});
