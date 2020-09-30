const { productApiRequest } = require('../../lib/productApi');
const { addErrorHandling, log } = require('../utils');
const createError = require('../../lib/createError');

const getTotalAts = (sku, atsKey) => (sku[atsKey] || []).reduce((totalAvailableToSell, { availableToSell }) => (
      availableToSell > 0 ? totalAvailableToSell + availableToSell : totalAvailableToSell
    ), 0)

const getTotalQuantityReserved = (sku) => (
    (sku.quantitiesReserved || []).reduce((totalQuantityReserved, { quantityReserved }) => (
      quantityReserved > 0 ? totalQuantityReserved + quantityReserved : totalQuantityReserved
    ), 0) + (sku.quantityReserved || 0)
)

const buildSizesArray = (
    skus,
    isOnlineOnly = false
) => {
      const atsKey = isOnlineOnly ? 'onlineAts' : 'ats'
      let sizes = skus.map(sku => {
        const atsTotal = isOnlineOnly ? Math.max(0, getTotalAts(sku, atsKey) - (sku.threshold || 0) - getTotalQuantityReserved(sku)) : getTotalAts(sku, atsKey)
        return atsTotal > 0
          ? sku.size
          : null
      });
      sizes = sizes.filter((size) => size);
      sizes = sizes.filter((size, position) => {
         return sizes.indexOf(size) == position
      });
      return sizes;
     }

const buildStoreInventory = (
    ats,
) => {
      const storeInventory = {};
      ats.forEach((skuAts) => {
        (skuAts.ats || []).forEach((storeAts) => {
          storeInventory[storeAts.storeId] = storeInventory[storeAts.storeId] || []
          if (!storeInventory[storeAts.storeId].includes(skuAts.size) && skuAts.size) {
            storeInventory[storeAts.storeId].push(skuAts.size)
          }
        })
      });
      return storeInventory;
     }

const buildStoresArray = (
    ats,
) => {
      const stores = [];
      ats.forEach((skuAts) => {
        (skuAts.ats || []).forEach((storeAts) => {
          if (!stores.includes(storeAts.storeId) && storeAts.storeId) {
            stores.push(storeAts.storeId)
          }
        })
      });
      return stores;
     }


const getSkuAtsByStyleAndSkuId = (styleId, params) => async skuId => (
  {
    styleId,
    skuId,
    ...await productApiRequest(params, `/inventory/ats/${styleId}/${skuId}`)
  }
)

const getSkuInventoryBatchedByStyleId = ({ styleIds, skuCollection, params }) => (
  Promise.all(styleIds.map(addErrorHandling(async styleId => {
    const skus = await skuCollection.find({ styleId }).toArray()
    const skuIds = skus.map(sku => sku._id)
    return Promise.all(skuIds.map(getSkuAtsByStyleAndSkuId(styleId, params)))
  })))
)

const logCtAtsUpdateErrors = ctAtsUpdateResults => {
  const errorResults = ctAtsUpdateResults.filter(productResult => !(productResult && productResult.ok))
  const errorCount = errorResults.length

  if (errorCount > 0) {
    createError.updateAlgoliaInventory.failedToUpdateCtAts(errorResults)
  }
}

const logCtAtsUpdateSuccesses = ctAtsUpdateResults => {
  const idsOfSuccessfullyUpdatedCtStyles = ctAtsUpdateResults
    .filter(styleUpdateResult => styleUpdateResult && styleUpdateResult.ok)
    .map(({ styleId }) => styleId)
  const successCount = idsOfSuccessfullyUpdatedCtStyles.length

  if (successCount > 0) {
    log(`Updated CT ATS for styles: ${idsOfSuccessfullyUpdatedCtStyles.join(', ')}`)
  }
}

module.exports = {
  buildSizesArray,
  buildStoreInventory,
  buildStoresArray,
  logCtAtsUpdateErrors,
  logCtAtsUpdateSuccesses,
  getSkuAtsByStyleAndSkuId,
  getSkuInventoryBatchedByStyleId
};
