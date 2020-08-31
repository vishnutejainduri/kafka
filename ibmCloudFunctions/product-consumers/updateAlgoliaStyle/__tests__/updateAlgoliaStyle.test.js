const updateAlgoliaStyle = require('../');

const styleId = "10"; // id fo a style that does not match any existing document

jest.mock("mongodb");
jest.mock("algoliasearch");

describe('updateAlgoliaStyle', () => {
    it('returns an error if params argument is empty', async () => {
        expect((await updateAlgoliaStyle({})).error).toBeTruthy();
    });

    it('Returns an error if invalid parmaeters are providede', async () => {
        const params = {
            topicName: 'some-topic',
            algoliaIndexName: 'index-name',
            algoliaApiKey: 'api-key',
            algoliaAppId: 'app-id',
            mongoUri: 'uri',
            dbName: 'db-name',
            collectionName: 'collection-name',
            mongoCertificateBase64: 'certificate',
            messages: [{
                values: [{}]
            }]
        };
        expect((await updateAlgoliaStyle(params)).error).toBeTruthy();
    });

    it('Successfully returns the results if all of the parmaeters and messages are provided', async () => {
        const params = {
            topicName: 'some-topic',
            algoliaIndexName: 'index-name',
            algoliaApiKey: 'api-key',
            algoliaAppId: 'app-id',
            mongoUri: 'uri',
            dbName: 'db-name',
            collectionName: 'updateAlgoliaStyle',
            mongoCertificateBase64: 'certificate',
            messages: [{
                topic: 'styles-connect-jdbc-CATALOG',
                value: {
                    BRAND_NAME_EN: 'some-brand',
                    STYLEID: styleId // id has to have a numeric part
                }
            }]
        };
        expect(await updateAlgoliaStyle(params)).toEqual({
            errors: [],
            failureIndexes: [],
            successCount: 1,
            shouldSkipResolvingOffsets: 1
         });
    });
});
