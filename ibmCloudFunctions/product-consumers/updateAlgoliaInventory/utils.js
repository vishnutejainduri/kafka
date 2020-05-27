const buildSizesArray = (
    ats,
) => {
      let sizes = ats.map((skuAts) => {
        return (skuAts.ats || []).length > 0
          ? skuAts.size
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
