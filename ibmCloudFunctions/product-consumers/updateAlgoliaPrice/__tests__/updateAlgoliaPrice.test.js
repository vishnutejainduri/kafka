const updateAlgoliaPrice = require('../');

describe('updateAlgoliaPrice', () => {
    it('Returns the params if all of the messages are valid', async () =>{
        const messages = [{
            topic: 'prices-connect-jdbc',
            value: {
                STYLE_ID: 'STYLE_ID',
                SITE_ID: 'SITE_ID',
                NEW_RETAIL_PRICE: 'NEW_RETAIL_PRICE'
            }
        }];
        const params = {
            messages,
            algoliaIndexName: 'algoliaIndexName',
            algoliaApiKey: 'algoliaApiKey',
            algoliaAppId: 'algoliaAppId',
            topicName: 'topicName',
            mongoUri: 'mongoUri',
            dbName: 'dbName',
            collectionName: 'collectionName',
            mongoCertificateBase64: 'mongoCertificateBase64'
        }
        
        const response = await updateAlgoliaPrice(params);
        expect(response).toEqual(params);
    });

    it('Returns an error if any of the messages are invalid', async () =>{
        const messages = [{
            topic: 'prices-connect-jdbc',
            value: {
                STYLE_ID: 'STYLE_ID',
                SITE_ID: 'SITE_ID',
                NEW_RETAIL_PRICE: 'NEW_RETAIL_PRICE'
            }
        },{
            topic: 'prices-connect-jdbc',
            value: {
                // Invalid message, missing STYLE_ID: 'STYLE_ID',
                SITE_ID: 'SITE_ID',
                NEW_RETAIL_PRICE: 'NEW_RETAIL_PRICE'
            }
        }];

        const params = {
            messages,
            algoliaIndexName: 'algoliaIndexName',
            algoliaApiKey: 'algoliaApiKey',
            algoliaAppId: 'algoliaAppId',
            topicName: 'topicName',
            mongoUri: 'mongoUri',
            dbName: 'dbName',
            collectionName: 'collectionName',
            mongoCertificateBase64: 'mongoCertificateBase64'
        }

        expect((await updateAlgoliaPrice(params)).error instanceof Error).toEqual(true);
    });
});
