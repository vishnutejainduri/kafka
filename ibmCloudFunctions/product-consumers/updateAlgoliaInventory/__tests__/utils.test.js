const {
  buildSizesArray,
  buildStoreInventory,
  buildStoresArray
} = require('../utils.js');

const validSku = {
  _id: 'skuId',
  size: {
    en: 'sizeEn',
    fr: 'sizeFr'
  },
  ats: [{
    storeId: 'storeId',
    availableToSell: 1
  }],
  onlineAts: [{
    storeId: 'storeId',
    availableToSell: 1
  }]
}

const validSkuOutOfStock = {
  _id: 'skuIdOutOfStock',
  size: {
    en: 'sizeEnOutOfStock',
    fr: 'sizeFrOutOfStock'
  },
  ats: [],
  onlineAts: []
}

const validSkuOutOfStockOnline = {
  _id: 'skuIdOutOfStockOnline',
  size: {
    en: 'sizeEnOutOfStockOnline',
    fr: 'sizeFrOutOfStockOnline'
  },
  ats: [{
    storeId: 'storeIdOutOfStockOnline',
    availableToSell: 1
  }],
  onlineAts: []
}

const validSkuOutOfStockThreshold = {
  _id: 'skuIdOutOfStockThreshold',
  size: {
    en: 'sizeEnOutOfStockThreshold',
    fr: 'sizeFrOutOfStockThreshold'
  },
  ats: [{
    storeId: 'storeIdOutOfStockThreshold',
    availableToSell: 1
  }],
  onlineAts: [{
    storeId: 'storeIdOutOfStockThreshold',
    availableToSell: 1
  }],
  threshold: 1000
}

const validSkuOutOfStockReserve = {
  _id: 'skuIdOutOfStockReserve',
  size: {
    en: 'sizeEnOutOfStockReserve',
    fr: 'sizeFrOutOfStockReserve'
  },
  ats: [{
    storeId: 'storeIdOutOfStockReserve',
    availableToSell: 1
  }],
  onlineAts: [{
    storeId: 'storeIdOutOfStockReserve',
    availableToSell: 1
  }],
  quantitiesReserved: [{
    quantityReserved: 1,
    lastModified: 1599146351000
  }]
}

describe('buildSizesArray', () => {
    it('two available skus should produce two available sizes', async () => {
      const validSkus = [validSku, { ...validSku, _id: 'skuId2', size: { en: 'sizeEn2', fr: 'sizeFr2' } }]
      const result = buildSizesArray(validSkus);
      expect(result).toEqual([ { en: 'sizeEn', fr: 'sizeFr' }, { en: 'sizeEn2', fr: 'sizeFr2' } ]); 
    });
    it('two available skus with duplicate sizes should produce one available size', async () => {
      const validSkus = [validSku, { ...validSku, _id: 'skuId2' }]
      const result = buildSizesArray(validSkus);
      expect(result).toEqual([ { en: 'sizeEn', fr: 'sizeFr' } ]); 
    });
    it('one available sku out of two skus should produce one available size', async () => {
      const validSkus = [validSku, validSkuOutOfStock]
      const result = buildSizesArray(validSkus);
      expect(result).toEqual([ { en: 'sizeEn', fr: 'sizeFr' } ]); 
    });
    it('no available skus out of two skus should produce no available sizes', async () => {
      const validSkus = [validSkuOutOfStock, { ...validSkuOutOfStock, _id: 'skuId2' } ]
      const result = buildSizesArray(validSkus);
      expect(result).toEqual([]); 
    });
    it('one online unavailable sku and one instore available sku should produce one available size', async () => {
      const validSkus = [validSkuOutOfStockOnline, { ...validSkuOutOfStock, _id: 'skuId2' } ]
      const result = buildSizesArray(validSkus);
      expect(result).toEqual([ { en: 'sizeEnOutOfStockOnline', fr: 'sizeFrOutOfStockOnline' } ]); 
    });
    it('two available skus should produce two available online sizes', async () => {
      const validSkus = [validSku, { ...validSku, _id: 'skuId2', size: { en: 'sizeEn2', fr: 'sizeFr2' } }]
      const result = buildSizesArray(validSkus, true);
      expect(result).toEqual([ { en: 'sizeEn', fr: 'sizeFr' }, { en: 'sizeEn2', fr: 'sizeFr2' } ]); 
    });
    it('one available sku and one out of stock sku should produce one available online sizes', async () => {
      const validSkus = [validSkuOutOfStock, { ...validSku, _id: 'skuId2', size: { en: 'sizeEn2', fr: 'sizeFr2' } }]
      const result = buildSizesArray(validSkus, true);
      expect(result).toEqual([ { en: 'sizeEn2', fr: 'sizeFr2' } ]); 
    });
    it('two available instore only skus should produce no available online sizes', async () => {
      const validSkus = [validSkuOutOfStockOnline, { ...validSkuOutOfStockOnline, _id: 'skuId2', size: { en: 'sizeEn2', fr: 'sizeFr2' } }]
      const result = buildSizesArray(validSkus, true);
      expect(result).toEqual([]); 
    });
    it('two available skus but one has a theshold making it online unavailable should produce one available online sizes', async () => {
      const validSkus = [validSku, { ...validSkuOutOfStockThreshold, _id: 'skuId2', size: { en: 'sizeEn2', fr: 'sizeFr2' } }]
      const result = buildSizesArray(validSkus, true);
      expect(result).toEqual([ { en: 'sizeEn', fr: 'sizeFr' }]); 
    });
    it('two available skus but one has a reserve making it online unavailable should produce one available online sizes', async () => {
      const validSkus = [validSku, { ...validSkuOutOfStockReserve, _id: 'skuId2', size: { en: 'sizeEn2', fr: 'sizeFr2' } }]
      const result = buildSizesArray(validSkus, true);
      expect(result).toEqual([ { en: 'sizeEn', fr: 'sizeFr' }]); 
    });
});

describe('buildStoreInventory', () => {
    it('two available skus from same store should produce two available sizes for same store id', async () => {
      const validSkus = [validSku, { ...validSku, _id: 'skuId2', size: { en: 'sizeEn2', fr: 'sizeFr2' } }]
      const result = buildStoreInventory(validSkus);
      expect(result).toEqual({
        'storeId': [{ en: 'sizeEn', fr: 'sizeFr' }, { en: 'sizeEn2', fr: 'sizeFr2' }]
      }); 
    });
    it('two available skus from different stores should produce two available sizes for different store ids', async () => {
      const validSkus = [validSku, { ...validSku, _id: 'skuId2', size: { en: 'sizeEn2', fr: 'sizeFr2' }, ats: [{ storeId: 'storeId2', availableToSell: 1}] }]
      const result = buildStoreInventory(validSkus);
      expect(result).toEqual({
        'storeId': [{ en: 'sizeEn', fr: 'sizeFr' }],
        'storeId2': [{ en: 'sizeEn2', fr: 'sizeFr2' }]
      }); 
    });
    it('two available skus from same stores with same sizes should produce one available size for one store id', async () => {
      const validSkus = [validSku, { ...validSku, _id: 'skuId2' }]
      const result = buildStoreInventory(validSkus);
      expect(result).toEqual({
        'storeId': [{ en: 'sizeEn', fr: 'sizeFr' }]
      }); 
    });
    it('two available skus from different stores with same sizes should produce one available size for different store ids', async () => {
      const validSkus = [validSku, { ...validSku, _id: 'skuId2', ats: [{ storeId: 'storeId2', availableToSell: 1}] }]
      const result = buildStoreInventory(validSkus);
      expect(result).toEqual({
        'storeId': [{ en: 'sizeEn', fr: 'sizeFr' }],
        'storeId2': [{ en: 'sizeEn', fr: 'sizeFr' }]
      }); 
    });

    it('one available and one unavailable sku from same stores should produce one available size for one store id', async () => {
      const validSkus = [validSkuOutOfStock, { ...validSku, _id: 'skuId2', size: { en: 'sizeEn2', fr: 'sizeFr2' } }]
      const result = buildStoreInventory(validSkus);
      expect(result).toEqual({
        'storeId': [{ en: 'sizeEn2', fr: 'sizeFr2' }]
      }); 
    });
    it('one available and one unavailable sku from different stores should produce one available size for different store ids', async () => {
      const validSkus = [validSkuOutOfStock, { ...validSku, _id: 'skuId2', size: { en: 'sizeEn2', fr: 'sizeFr2' }, ats: [{ storeId: 'storeId2', availableToSell: 1}] }]
      const result = buildStoreInventory(validSkus);
      expect(result).toEqual({
        'storeId2': [{ en: 'sizeEn2', fr: 'sizeFr2' }]
      }); 
    });
    it('no available skus from different stores should produce no available sizes for different store ids', async () => {
      const validSkus = [validSkuOutOfStock, { ...validSkuOutOfStock, _id: 'skuId2', size: { en: 'sizeEn2', fr: 'sizeFr2' } }]
      const result = buildStoreInventory(validSkus);
      expect(result).toEqual({}); 
    });
    it('one online available sku and one instore available sku from different stores should produce one available sizes for different store ids', async () => {
      const validSkus = [validSkuOutOfStock, { ...validSkuOutOfStockOnline, _id: 'skuId2', size: { en: 'sizeEn2', fr: 'sizeFr2' }, ats: [{ storeId: 'storeId2', availableToSell: 1}] }]
      const result = buildStoreInventory(validSkus);
      expect(result).toEqual({
        'storeId2': [{ en: 'sizeEn2', fr: 'sizeFr2' }]
      }); 
    });
    it('one online available sku and one instore available sku from same stores should produce one available sizes for different store ids', async () => {
      const validSkus = [validSkuOutOfStock, { ...validSkuOutOfStockOnline, _id: 'skuId2', size: { en: 'sizeEn2', fr: 'sizeFr2' }, ats: [{ storeId: 'storeId', availableToSell: 1}] }]
      const result = buildStoreInventory(validSkus);
      expect(result).toEqual({
        'storeId': [{ en: 'sizeEn2', fr: 'sizeFr2' }]
      }); 
    });
});

describe('buildStoresArray', () => {
    it('two available skus should produce two available stores', async () => {
      const validSkus = [validSku, { ...validSku, _id: 'skuId2', size: { en: 'sizeEn2', fr: 'sizeFr2' }, ats: [{ storeId: 'storeId2', availableToSell: 1}] }]
      const result = buildStoresArray(validSkus);
      expect(result).toEqual([ 'storeId', 'storeId2' ]); 
    });
    it('two available skus with duplicate storeids should produce one available stores', async () => {
      const validSkus = [validSku, { ...validSku, _id: 'skuId2', size: { en: 'sizeEn2', fr: 'sizeFr2' }, ats: [{ storeId: 'storeId', availableToSell: 1}] }]
      const result = buildStoresArray(validSkus);
      expect(result).toEqual([ 'storeId' ]); 
    });
    it('one available sku out of two should produce one available stores', async () => {
      const validSkus = [validSkuOutOfStock, { ...validSku, _id: 'skuId2', size: { en: 'sizeEn2', fr: 'sizeFr2' }, ats: [{ storeId: 'storeId2', availableToSell: 1}] }]
      const result = buildStoresArray(validSkus);
      expect(result).toEqual([ 'storeId2' ]); 
    });
    it('no available sku out of two should produce no available stores', async () => {
      const validSkus = [validSkuOutOfStock, { ...validSku, _id: 'skuId2', size: { en: 'sizeEn2', fr: 'sizeFr2' }, ats: [] }]
      const result = buildStoresArray(validSkus);
      expect(result).toEqual([]); 
    });
    it('one online available sku and one instore available sku should produce one available stores', async () => {
      const validSkus = [validSkuOutOfStock, { ...validSkuOutOfStockOnline, _id: 'skuId2', size: { en: 'sizeEn2', fr: 'sizeFr2' }, ats: [{ storeId: 'storeId2', availableToSell: 1}] }]
      const result = buildStoresArray(validSkus);
      expect(result).toEqual([ 'storeId2' ]); 
    });
});
