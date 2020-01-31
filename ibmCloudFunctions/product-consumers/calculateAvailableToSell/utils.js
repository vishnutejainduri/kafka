const createError = require('../../lib/createError');

const handleStyleAtsUpdate = async (
    atsData,
    styles,
    isOnline
) => {
          const atsKey = isOnline ? 'onlineAts' : 'ats';
          const findSkuIdKey = atsKey + '.skuId';
          const findSkuIdStoreIdKey = atsKey + '.ats.storeId';
          const updateAtsKey = atsKey + '.$.ats'; 

          await styles.updateOne({ _id: atsData.styleId, [findSkuIdKey] : atsData.skuId, [findSkuIdStoreIdKey] : atsData.storeId }, { $pull: { [updateAtsKey] : { 'storeId': atsData.storeId } } }, { upsert: true })
                      .catch(originalError => {
                          throw createError.calculateAvailableToSell.failedRemoveStyleAts(originalError, atsData);
                      })
          if (atsData.availableToSell > 0) {
            return styles.updateOne({ _id: atsData.styleId, [findSkuIdKey]: atsData.skuId }, { $push: { [updateAtsKey]: { 'storeId': atsData.storeId, 'availableToSell': atsData.availableToSell } }, $currentDate: { lastModifiedInternalAts: { $type:"timestamp" } } }, { upsert: true })
                .catch(originalError => {
                    throw createError.calculateAvailableToSell.failedUpdateStyleAts(originalError, atsData);
                })
          }
          return null;
     }

const handleSkuAtsUpdate = async (
    atsData,
    skus,
    isOnline
) => {
          const atsKey = isOnline ? 'onlineAts' : 'ats';
          const findStoreIdKey = atsKey + '.storeId';

          await skus.updateOne({ _id: atsData.skuId, [findStoreIdKey] : atsData.storeId }, { $pull: { [atsKey] : { 'storeId': atsData.storeId } } }, { upsert: true })
                      .catch(originalError => {
                          throw createError.calculateAvailableToSell.failedRemoveSkuAts(originalError, atsData);
                      })
          
          if (atsData.availableToSell > 0) {
            return skus.updateOne({ _id: atsData.skuId }, { $push: { [atsKey] : { 'storeId': atsData.storeId, 'availableToSell': atsData.availableToSell } }, $currentDate: { lastModifiedInternalAts: { $type:"timestamp" } } }, { upsert: true })
              .catch(originalError => {
                  throw createError.calculateAvailableToSell.failedUpdateSkuAts(originalError, atsData);
              })
          }
          return null;
     }

module.exports = {
    handleStyleAtsUpdate,
    handleSkuAtsUpdate
};
