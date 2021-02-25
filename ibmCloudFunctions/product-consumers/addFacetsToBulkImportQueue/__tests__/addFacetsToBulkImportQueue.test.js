const addFacetsToBulkImportQueue = require('../index');
const { removeNotReturnablePromoStickerMessage } = require('../utils')
const getCollection = require('../../../lib/getCollection')

jest.mock('../../../lib/messagesLogs');
jest.mock("mongodb")

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

describe('addFacetsToBulkImportQueue', function() {
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

describe('removeNotReturnablePromoStickerMessage', () => {
    // T T
    it('Returns true if not promo sticker and is returnable', async function() {
        const styles = await getCollection(params, 'styles')
        const facetData = { styleId: 'style-id-is-returnable-true', facetName: null, facetValue: { en: "Hello", fr: "There" } }
        const response = await removeNotReturnablePromoStickerMessage(styles)(facetData)
        
        expect(response).toBe(true)
    })

    // T F
    it('Returns true if not promo sticker and is not returnable', async function() {
        const styles = await getCollection(params, 'styles')
        const facetData = { styleId: 'style-id-is-returnable-false', facetName: null, facetValue: { en: "Hello", fr: "There" } }
        const response = await removeNotReturnablePromoStickerMessage(styles)(facetData)
        
        expect(response).toBe(true)
    })

    // F T
    it('Returns true if promo sticker and is returnable', async function() {
        const styles = await getCollection(params, 'styles')
        const facetData = { styleId: 'style-id-is-returnable-true', facetName: "promotionalSticker", facetValue: { en: "Hello", fr: "There" } }
        const response = await removeNotReturnablePromoStickerMessage(styles)(facetData)
        
        expect(response).toBe(true)
    })

    // F F
    it('Returns false if promo sticker and is not returnable', async function() {
        const styles = await getCollection(params, 'styles')
        const facetData = { styleId: 'style-id-is-returnable-false', facetName: "promotionalSticker", facetValue: { en: "Hello", fr: "There" } }
        const response = await removeNotReturnablePromoStickerMessage(styles)(facetData)
        
        expect(response).toBe(false)
    })
})
