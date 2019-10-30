const updateAlgoliaStyle = require('../');

jest.mock("mongodb", () => ({
    MongoClient: {
        connect: async () => ({
            db: () => ({
                collection: () => {}
            })
        })
    }
}));

describe('updateAlgoliaStyle', () => {
    it('throws an error if params argument is empty', async () => {
        const params = {};
        expect(await updateAlgoliaStyle(params).catch(error => error) instanceof Error).toBe(true);
    });

    it('successfuly executes if all of the parmaeters are provided', async () => {
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
})