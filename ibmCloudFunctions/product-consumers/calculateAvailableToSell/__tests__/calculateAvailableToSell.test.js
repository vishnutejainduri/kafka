const getCollection = require('../../../lib/getCollection');
const calculateAvailableToSell = require('../');
const { handleSkuAtsUpdate } = require('../utils');

jest.mock("mongodb");

const increaseAtsTestData = {
    'lastModifiedDate': 1000000000000,
    'quantityBackOrder':0,
    'quantityInTransit':0,
    'quantityInPicking':0,
    'quantityOnHand':1,
    'availableToSell':1,
    'quantityOnHandNotSellable':0,
    'quantityOnHandSellable':1,
    'quantityOnOrder':0,
    'skuId': 'skuId',
    'storeId': 34,
    'styleId': 'styleId' 
 };
 
const validMessage = {
    topic: 'inventory-connect-jdbc-SKUINVENTORY',
    value: {
      STYLE_ID:'styleId',
      SKU_ID:'skuId',
      STORE_ID:'storeId',
      QBO:0,
      QIT:0,
      QIP:0,
      QOH:0,
      QOHNOTSELLABLE:0,
      QOHSELLABLE:1,
      QOO:0,
      LASTMODIFIEDDATE:1000000000,
      INV_FKORGANIZATIONNO: '1'
    }
};

const params = {
    messages: [validMessage],
    mongoUri: 'mongo-uri',
    dbName: 'db-name',
    mongoCertificateBase64: 'mong-certificate',
    collectionName: 'inventory',
    stylesCollectionName: 'styles',
    skusCollectionName: 'skus',
    storesCollectionName: 'stores',
    styleAvailabilityCheckQueue: 'styleAvailabilityCheckQueue',
    bulkAtsRecalculateQueue: 'bulkAtsRecalculateQueue' 
}

describe('calculateAvailableToSell', () => {
    const resultWithNoErrors = {
        batchSuccessCount: 1,
        messagesCount: 1,
        ok: true,
        shouldSkipResolvingOffsets: 1
    }
    it('missing all parameters; should fail', async () => {
        const result = await expect(calculateAvailableToSell({}));
        expect(result).toBeInstanceOf(Object);
    });
    it('correct message to update ats', async () => {
        const response = await calculateAvailableToSell(params);
        // returns nothing/undefined if successfully run
        expect(response).toEqual(resultWithNoErrors);
    });
    it('invalid message to update ats', async () => {
        const invalidMessage = {};
        const response = await calculateAvailableToSell({
            ...params,
            messages: [validMessage, invalidMessage, validMessage]
        });
        // returns nothing/undefined if successfully run
        console.log('response', response);
        expect(response.batchSuccessCount).toEqual(1)
        expect(response.messagesCount).toEqual(3)
    });
    it('correct messages to update ats; should batch together', async () => {
        const response = await calculateAvailableToSell({
            ...params,
            messages: [validMessage, validMessage]
        });
        // returns nothing/undefined if successfully run
        expect(response.batchSuccessCount).toEqual(1)
        expect(response.messagesCount).toEqual(2)
    });
    it('correct messages to update ats; should batch seperately', async () => {
        const response = await calculateAvailableToSell({
            ...params,
            messages: [validMessage, { topic: validMessage.topic, value: { ...validMessage.value, STORE_ID: 250 } }]
        });
        // returns nothing/undefined if successfully run
        expect(response.batchSuccessCount).toEqual(2)
        expect(response.messagesCount).toEqual(2)
    });
});

describe('handleSkuAtsUpdate', () => {
    it('missing all params; should fail', async () => {
        const skus = await getCollection(params, params.skusCollectionName);

        let atsUpdates = [await handleSkuAtsUpdate({}, skus, false)];
        atsUpdates = atsUpdates.filter((atsUpdate) => atsUpdate);
        expect(atsUpdates.length).toBe(0);
    });

    it('add to empty ats', async () => {
        const skus = await getCollection(params, params.skusCollectionName);

        let atsUpdates = [await handleSkuAtsUpdate(increaseAtsTestData, skus, false)];
        atsUpdates = atsUpdates.filter((atsUpdate) => atsUpdate);
        expect(atsUpdates.length).toBe(1);
    });
});
