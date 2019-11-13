const updateAlgoliaStyle = require('../');

const styleId = "10"; // id fo a style that does not match any existing document
const result = { id: "success"} // result of a success insert for 'updateAlgoliaStyleCount' collection

jest.mock("mongodb");
jest.mock("algoliasearch");

describe('updateAlgoliaStyle', () => {
    it('throws an error if params argument is empty', async () => {
        const params = {};
        expect(await updateAlgoliaStyle(params).catch(error => error) instanceof Error).toBe(true);
    });

    it('does not throw if all of the parmaeters are provided, regardless of their value', async () => {
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
        expect(await updateAlgoliaStyle(params)).toBe(undefined);
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
        expect(await updateAlgoliaStyle(params)).toEqual(Object.assign({}, params, result));
    });
});
