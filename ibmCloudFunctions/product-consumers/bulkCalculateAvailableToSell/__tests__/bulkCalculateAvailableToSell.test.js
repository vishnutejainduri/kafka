const bulkCalculateAvailableToSell = require('../');
const getCollection = require('../../../lib/getCollection');
const { calculateSkuAts, calculateStyleAts }  = require('../utils');

jest.mock("mongodb");

const params = {
    mongoUri: 'mongo-uri',
    dbName: 'db-name',
    mongoCertificateBase64: 'mong-certificate',
    collectionName: 'bulkAtsRecalculateQueue',
    styleAvailabilityCheckQueue: 'styleAvailabilityCheckQueue',
    stylesCollectionName: 'styles',
    skusCollectionName: 'skus',
    storesCollectionName: 'stores',
    inventoryCollectionName: 'inventory'
}

describe('bulkCalculateAvailableToSell', () => {
    it('missing all parameters; should fail', async () => {
        await expect(bulkCalculateAvailableToSell({})).rejects.toThrow();
    });
    it('valid message', async () => {
        let response = null;
        response = await bulkCalculateAvailableToSell(params);
        expect(response).toEqual(undefined);
    });
    it('valid calculateStyleAts execution', async () => {
        const styles = await getCollection(params, params.stylesCollectionName)
        const skus = await getCollection(params, params.skusCollectionName)
        const stores = await getCollection(params, params.storesCollectionName)
        const inventory = await getCollection(params, params.inventoryCollectionName)
        const styleToRecalcAts = 'styleId';

        const { skuAtsOperations, styleAts, styleOnlineAts } = await calculateStyleAts(styleToRecalcAts, styles, skus, stores, inventory);
        expect(styleAts[0].ats).toEqual([]);
        expect(styleOnlineAts[0].ats).toEqual([]);
        expect(skuAtsOperations[0]).toBeInstanceOf(Promise);
    });
    it('valid calculateSkuAts execution', async () => {
        const stores = await getCollection(params, params.storesCollectionName)
        const inventory = await getCollection(params, params.inventoryCollectionName)
        const skuRecord = { _id: 'skuId' };
        const styleData = { _id: 'styleId', departmentId: 'departmentId' };

        const { skuAts, skuOnlineAts } = await calculateSkuAts(skuRecord, styleData, stores, inventory);
        expect(skuAts).toEqual([]);
        expect(skuOnlineAts).toEqual([]);
    });
});
