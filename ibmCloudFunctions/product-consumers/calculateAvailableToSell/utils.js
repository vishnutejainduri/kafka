const createError = require('../../lib/createError');

const handleSkuAtsUpdate = async (
    atsData,
    skuData,
    styleData,
    skus,
    styles,
    isOnline
) => {
          const atsKey = isOnline ? 'onlineAts' : 'ats';
          const findStoreIdKey = atsKey + '.storeId';

          if (!skuData) {
              try {
                await skus.insert({ _id: atsData.skuId, id: atsData.skuId, styleId: atsData.styleId });
              } catch (error) {
                  // ignore, because it most possibly means that the sku was inserted by another message run in parallel
                  // if it has failed for any other reason e.g. network issues and the entry has not been inserted, the next steps will fail as well
              }
          }
          if (!styleData) {
              try {
                await styles.insert({ _id: atsData.styleId, id: atsData.styleId });
              } catch (error) {
                  // ignore, because it most possibly means that the style was inserted by another message run in parallel
              }
          }

          await skus.updateOne({ _id: atsData.skuId, [findStoreIdKey] : atsData.storeId }, { $pull: { [atsKey] : { 'storeId': atsData.storeId } } })
                      .catch(originalError => {
                          throw createError.calculateAvailableToSell.failedRemoveSkuAts(originalError, atsData);
                      })
          
          if (atsData.availableToSell > 0) {
            return skus.updateOne({ _id: atsData.skuId }, { $push: { [atsKey] : { 'storeId': atsData.storeId, 'availableToSell': atsData.availableToSell } }, $currentDate: { lastModifiedInternalAts: { $type:"timestamp" } } })
              .catch(originalError => {
                  throw createError.calculateAvailableToSell.failedUpdateSkuAts(originalError, atsData);
              })
          }
          return null;
     }

module.exports = {
    handleSkuAtsUpdate
};
