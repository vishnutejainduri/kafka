const updateAlgoliaPrice = require('../');

jest.mock("mongodb");
jest.mock("algoliasearch");

describe('updateAlgoliaPrice', () => {
    const validParams = {
        algoliaIndexName: 'algoliaIndexName',
        algoliaApiKey: 'algoliaApiKey',
        algoliaAppId: 'algoliaAppId',
        topicName: 'topicName',
        mongoUri: 'mongoUri',
        dbName: 'dbName',
        collectionName: 'styles',
        pricesCollectionName: 'prices',
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

        const error = await updateAlgoliaPrice(params).catch(error => error)
        expect(error.debugInfo.messageFailures.length).toBe(1);
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

        const error = await updateAlgoliaPrice(params).catch(error => error)
        expect(error.debugInfo.messageFailures.length).toBe(1);
        //TODO: Explictly check for valid/invalid message in returned error.debugInfo
        expect(error.debugInfo.messageFailures[0]).toBeInstanceOf(Error)
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

        const error = await updateAlgoliaPrice(params).catch(error => error)
        expect(error.debugInfo.messageFailures.length).toBe(1);
        //TODO: Explictly check for valid/invalid message in returned error.debugInfo
        expect(error.debugInfo.messageFailures[0]).toBeInstanceOf(Object)
    });
});
