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

const params = {
    messages: [increaseAtsTestData],
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
        errors: [],
        failureIndexes: []
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
            messages: [increaseAtsTestData, invalidMessage, increaseAtsTestData]
        });
        // returns nothing/undefined if successfully run
        expect(response.failureIndexes.includes(1)).toEqual(true);
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
