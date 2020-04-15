const { getExistingCtStyle, getProductType, existingCtStyleIsNewer, updateStyle, createAndPublishStyle } = require('../styleUtils');
const { styleAttributeNames } = require('../constantsCt');

const updateStyleOutlet = async (ctHelpers, productTypeId, stylesBasicMessage) => {
    const productType = await getProductType(productTypeId, ctHelpers);
    const existingCtStyle = await getExistingCtStyle(stylesBasicMessage.id, ctHelpers);

    if (!existingCtStyle) {
      existingCtStyle = (await createAndPublishStyle ({ id: stylesFacetMessage.id, name: { 'en-CA': '', 'fr-CA': '' } }, { id: productTypeId }, null, ctHelpers)).body;
    }
    if (existingCtStyleIsNewer(existingCtStyle, stylesBasicMessage, styleAttributeNames.STYLE_OUTLET_LAST_MODIFIED_INTERNAL)) {
      return null;
    }
    return updateStyle({ style: stylesBasicMessage, existingCtStyle, productType, ctHelpers});
};

module.exports = {
  updateStyleOutlet
};
