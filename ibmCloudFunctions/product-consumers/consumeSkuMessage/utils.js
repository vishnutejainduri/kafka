const createError = require('../../lib/createError');

const handleSkuAtsSizeUpdate = (
    skuData,
    styles,
    isOnline
) => {
          const atsKey = isOnline ? 'onlineAts' : 'ats';
          const findSkuKey = atsKey + '.skuId';
          const findSizeKey = atsKey + '.$.size';

          return styles.updateOne({ _id: skuData.styleId, [findSkuKey] : skuData._id }, { $set: { [findSizeKey] : skuData.size } })
            .catch(originalError => {
                throw createError.consumeSkuMessage.failedUpdateStyleAts(originalError, skuData);
            })
     }

module.exports = {
  handleSkuAtsSizeUpdate
};
