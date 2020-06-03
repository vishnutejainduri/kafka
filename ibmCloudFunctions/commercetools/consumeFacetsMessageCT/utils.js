const { getExistingCtStyle, getProductType, updateStyle, createAndPublishStyle } = require('../styleUtils');

/**
 * There's an assumption in this function that we will never sync microsites to CT (based on
 * filterFacetMessageCt() ).
 */
const updateStyleFacets = async (ctHelpers, productTypeId, stylesFacetMessage) => {
    const productType = await getProductType(productTypeId, ctHelpers);
    let existingCtStyle = await getExistingCtStyle(stylesFacetMessage.id, ctHelpers);

    if (!existingCtStyle) {
      existingCtStyle = (await createAndPublishStyle ({ id: stylesFacetMessage.id, name: { 'en-CA': '', 'fr-CA': '' } }, { id: productTypeId }, null, ctHelpers)).body;
    }
    return updateStyle({ style: stylesFacetMessage, existingCtStyle, productType, ctHelpers});
};

module.exports = {
  updateStyleFacets
};
