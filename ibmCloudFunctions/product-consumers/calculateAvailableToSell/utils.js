const handleStyleAtsUpdate = async (
    atsData,
    styles,
    atsUpdates,
    isOnline
) => {
          isOnline
            ? await styles.updateOne({ _id: atsData.styleId, 'onlineAts.skuId': atsData.skuId, 'onlineAts.ats.storeId': atsData.storeId }, { $pull: { 'onlineAts.$.ats': { 'storeId': atsData.storeId } } })
            : await styles.updateOne({ _id: atsData.styleId, 'ats.skuId': atsData.skuId, 'ats.ats.storeId': atsData.storeId }, { $pull: { 'ats.$.ats': { 'storeId': atsData.storeId } } });
          if (atsData.availableToSell > 0) {
              isOnline
                ? atsUpdates.push(
                                styles.updateOne({ _id: atsData.styleId, 'onlineAts.skuId': atsData.skuId }, { $push: { 'onlineAts.$.ats': { 'storeId': atsData.storeId, 'availableToSell': atsData.availableToSell } }, $currentDate: { lastModifiedInternalAts: { $type:"timestamp" } } })
                                    .catch(originalError => {
                                        throw createError.calculateAvailableToSell.failedUpdateStyleAts(originalError, atsData);
                                    })
                )
                : atsUpdates.push(
                                styles.updateOne({ _id: atsData.styleId, 'ats.skuId': atsData.skuId }, { $push: { 'ats.$.ats': { 'storeId': atsData.storeId, 'availableToSell': atsData.availableToSell } }, $currentDate: { lastModifiedInternalAts: { $type:"timestamp" } } })
                                    .catch(originalError => {
                                        throw createError.calculateAvailableToSell.failedUpdateStyleAts(originalError, atsData);
                                    })
                )
          }
          return atsUpdates;
     }

const handleSkuAtsUpdate = async (
    atsData,
    skus,
    atsUpdates,
    isOnline
) => {
          isOnline
            ? await skus.updateOne({ _id: atsData.skuId, 'onlineAts.storeId': atsData.storeId }, { $pull: { 'onlineAts': { 'storeId': atsData.storeId } } })
            : await skus.updateOne({ _id: atsData.skuId, 'ats.storeId': atsData.storeId }, { $pull: { 'ats': { 'storeId': atsData.storeId } } })
          
          if (atsData.availableToSell > 0) {
              isOnline
                ? atsUpdates.push(
                            skus.updateOne({ _id: atsData.skuId }, { $push: { 'onlineAts': { 'storeId': atsData.storeId, 'availableToSell': atsData.availableToSell } }, $currentDate: { lastModifiedInternalAts: { $type:"timestamp" } } })
                              .catch(originalError => {
                                  throw createError.calculateAvailableToSell.failedUpdateSkuAts(originalError, atsData);
                              })
                )
                : atsUpdates.push(
                            skus.updateOne({ _id: atsData.skuId }, { $push: { 'ats': { 'storeId': atsData.storeId, 'availableToSell': atsData.availableToSell } }, $currentDate: { lastModifiedInternalAts: { $type:"timestamp" } } })
                              .catch(originalError => {
                                  throw createError.calculateAvailableToSell.failedUpdateSkuAts(originalError, atsData);
                              })
                )
          }
          return atsUpdates;
     }

module.exports = {
    handleStyleAtsUpdate,
    handleSkuAtsUpdate
};
