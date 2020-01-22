const getCollection = require('../../../lib/getCollection');
const calculateAvailableToSell = require('../');
const { handleStyleAtsUpdate, handleSkuAtsUpdate } = require('../utils');

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
    styleAvailabilityCheckQueue: 'styleAvailabilityCheckQueue'
}

describe('calculateAvailableToSell', () => {
    it('missing all parameters; should fail', async () => {
        const result = await expect(calculateAvailableToSell({}));
        expect(result).toBeInstanceOf(Object);
    });
    it('correct message to update ats', async () => {
        const response = await calculateAvailableToSell(params);
        // returns nothing/undefined if successfully run
        expect(response).toEqual(undefined);
    });
});

describe('handleSyleAtsUpdate', () => {
    it('missing all params; should fail', async () => {
        const styles = await getCollection(params, params.stylesCollectionName);

        const atsUpdates = await handleStyleAtsUpdate({}, styles, [], false);
        expect(atsUpdates.length).toBe(0);
    });

    it('add to empty ats', async () => {
        const styles = await getCollection(params, params.stylesCollectionName);

        const atsUpdates = await handleStyleAtsUpdate(increaseAtsTestData, styles, [], false);
        expect(atsUpdates.length).toBe(1);
    });
});

describe('handleSkuAtsUpdate', () => {
    it('missing all params; should fail', async () => {
        const skus = await getCollection(params, params.skusCollectionName);

        const atsUpdates = await handleSkuAtsUpdate({}, skus, [], false);
        expect(atsUpdates.length).toBe(0);
    });

    it('add to empty ats', async () => {
        const skus = await getCollection(params, params.skusCollectionName);

        const atsUpdates = await handleSkuAtsUpdate(increaseAtsTestData, skus, [], false);
        expect(atsUpdates.length).toBe(1);
    });
});
