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
   'quantityOnHandSellable':0,
   'quantityOnOrder':0,
   'skuId': 'skuId',
   'storeId': 34,
   'styleId': 'styleId' 
};

describe('calculateAvailableToSell', () => {
    it('missing all parameters; should fail', async () => {
        let response = null;
        await calculateAvailableToSell().catch(error => { response = error});
        expect(response instanceof Error).toBe(true);
    });
    it('correct message to update ats', async () => {
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
        const response = await calculateAvailableToSell(params);
        // returns nothing/undefined if successfully run
        expect(response).toEqual(undefined);
    });
});

describe('handleSyleAtsUpdate', () => {
    it('missing all params; should fail', () => {
        const atsData = {};
        const ats = [];
        const threshold = 0;

        const atsResult = handleStyleAtsUpdate(ats, atsData, threshold);
        expect(atsResult.length).toBe(0);
    });

    it('add to empty ats', () => {
        const ats = [];
        const threshold = 0;

        const atsResult = handleStyleAtsUpdate(ats, increaseAtsTestData, threshold);
        expect(atsResult.length).toBe(1);
    });
});

describe('handleSkuAtsUpdate', () => {
    it('missing all params; should fail', () => {
        const atsData = {};
        const ats = [];

        const atsResult = handleSkuAtsUpdate(ats, atsData);
        expect(atsResult.length).toBe(0);
    });

    it('add to empty ats', () => {
        const ats = [];

        const atsResult = handleSkuAtsUpdate(ats, increaseAtsTestData);
        expect(atsResult.length).toBe(1);
    });
});
