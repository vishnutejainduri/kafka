const { PROMO_STICKER } = require('../../lib/constants');

const removeNotReturnablePromoStickerMessage = styles => async (facetData) => {
  const styleData = await styles.findOne({ _id: facetData.styleId })

  return !!(!facetData[PROMO_STICKER] || styleData.isReturnable === true)
};

module.exports = {
  removeNotReturnablePromoStickerMessage
}
