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
        topic: 'sale-prices-connect-jdbc',
        value: {
            STYLE_ID: 'styleId-with-priceChange',
            PRICE_CHANGE_ID: 'priceChangeId',
            START_DATE: '2020',
            END_DATE: '2021',
            ACTIVITY_TYPE: 'a',
            PROCESS_DATE_CREATED: 2020,
            NEW_RETAIL_PRICE: 100,
            SITE_ID: 'siteId'
        }
    };

    const invalidMessage = {
        topic: 'sale-prices-connect-jdbc',
        value: {
            // Invalid message, missing STYLE_ID
            STYLE_ID: undefined,
            PRICE_CHANGE_ID: 'priceChangeId',
            START_DATE: '2020',
            END_DATE: '2021',
            ACTIVITY_TYPE: 'a',
            PROCESS_DATE_CREATED: 2020,
            NEW_RETAIL_PRICE: 'newRetailPrice',
            SITE_ID: 'siteId'
        }
    };

    it('Returns the params if all of the messages are valid', async () =>{
        const messages = [validMessage];
        const params = {
            ...validParams,
            messages
        };
        
        const response = await updateAlgoliaPrice(params);
        expect(response).toEqual({
            failureIndexes: [],
            errors: [],
            successCount: 1
        });
    });

    it('Returns a succesful response but no update to algolia if any of the styles are missing an originalPrice', async () =>{
        const messages = [{...validMessage, value: { ...validMessage.value, STYLE_ID: 'style-id-no-original-price' } }];
        const params = {
            ...validParams,
            messages
        };
        
        const response = await updateAlgoliaPrice(params);
        expect(response).toEqual({
            failureIndexes: [],
            errors: [],
            successCount: 1
        });
    });

    it('Returns an array of failed messages if any of the messages are invalid', async () =>{
        const messages = [
            invalidMessage,
            validMessage
        ];

        const params = {
            ...validParams,
            messages
        };

        const response = await updateAlgoliaPrice(params)
        expect(response.failureIndexes.length).toEqual(1);
        expect(response.failureIndexes[0]).toEqual(0);
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

        const response = await updateAlgoliaPrice(params)

        expect(response.failureIndexes.length).toBe(1);
        expect(response.failureIndexes[0]).toEqual(1)
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

        const response = await updateAlgoliaPrice(params)
        expect(response.failureIndexes.length).toBe(1);
        expect(response.failureIndexes[0]).toEqual(1)
    });
});
