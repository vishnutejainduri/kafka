const createError = require('../../lib/createError');

const handleSkuAtsUpdate = async (
    atsData,
    skus,
    isOnline
) => {
          const atsKey = isOnline ? 'onlineAts' : 'ats';
          const findStoreIdKey = atsKey + '.storeId';

          const skuExists = Boolean(await skus.findOne({ _id: atsData.skuId }));
          if (!skuExists) {
              try {
                await skus.insert({  _id: atsData.skuId });
              } catch (error) {
                  // ignore, because it most possibly means that the sku was inserted by another message run in parallel
                  // if it has failed for any other reason e.g. network issues and the entry has not been inserted, the next steps will fail as well
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
