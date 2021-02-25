const { PROMO_STICKER } = require('../../lib/constants');

const messageIncludesStickerForNonReturnableStyle = styles => async (facetData) => {
  const styleData = await styles.findOne({ _id: facetData.styleId })

  return facetData.facetName !== PROMO_STICKER || styleData.isReturnable === true
};

module.exports = {
  messageIncludesStickerForNonReturnableStyle
}
