const updateAlgoliaPrice = require('../');

describe('updateAlgoliaPrice', () => {
    const validParams = {
        algoliaIndexName: 'algoliaIndexName',
        algoliaApiKey: 'algoliaApiKey',
        algoliaAppId: 'algoliaAppId',
        topicName: 'topicName',
        mongoUri: 'mongoUri',
        dbName: 'dbName',
        collectionName: 'collectionName',
        mongoCertificateBase64: 'mongoCertificateBase64'
    };

    const validMessage = {
        topic: 'prices-connect-jdbc',
        value: {
            STYLE_ID: 'STYLE_ID',
            SITE_ID: 'SITE_ID',
            NEW_RETAIL_PRICE: 'NEW_RETAIL_PRICE'
        }
    };

    const invalidMessage = {
        topic: 'prices-connect-jdbc',
        value: {
            // Invalid message, missing STYLE_ID: 'STYLE_ID',
            SITE_ID: 'SITE_ID',
            NEW_RETAIL_PRICE: 'NEW_RETAIL_PRICE'
        }
    };

    it('Returns the params if all of the messages are valid', async () =>{
        const messages = [validMessage];
        const params = {
            ...validParams,
            messages
        };
        
        const response = await updateAlgoliaPrice(params);
        expect(response).toEqual(params);
    });

    it('Returns an array of failed messages if any of the messages are invalid', async () =>{
        const messages = [
            validMessage,
            invalidMessage
        ];

        const params = {
            ...validParams,
            messages
        };

        expect((await updateAlgoliaPrice(params)).messageFailures.length).toBe(1);
    });

    it('Returns an array of failed messages if any of the messages are invalid', async () =>{
        const messages = [
            validMessage,
            invalidMessage
        ];

        const params = {
            ...validParams,
            messages
        };

        expect((await updateAlgoliaPrice(params)).messageFailures.length).toBe(1);
        expect((await updateAlgoliaPrice(params)).messageFailures[0].message).toEqual(invalidMessage);
    });

    it('Filters out invalid messages from response messages property', async () =>{
        const messages = [
            validMessage,
            invalidMessage
        ];

        const params = {
            ...validParams,
            messages
        };

        expect((await updateAlgoliaPrice(params)).messages.length).toBe(1);
        expect((await updateAlgoliaPrice(params)).messages[0]).toEqual(validMessage);
    });
});
