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

module.exports = {
  buildSizesArray,
  buildStoreInventory,
  buildStoresArray,
};
