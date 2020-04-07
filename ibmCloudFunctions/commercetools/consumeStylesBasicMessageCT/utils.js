const { addRetries } = require('../../product-consumers/utils');
const { getExistingCtStyle, getProductType, existingCtStyleIsNewer, updateStyle } = require('../styleUtils');
const { styleAttributeNames } = require('../constantsCt');

const updateStyleOutlet = async (ctHelpers, productTypeId, stylesBasicMessage) => {
    const productType = await getProductType(productTypeId, ctHelpers);
    const existingCtStyle = await getExistingCtStyle(stylesBasicMessage.id, ctHelpers);

    if (!existingCtStyle) {
      throw new Error('Style does not exist');
    }
    if (existingCtStyleIsNewer(existingCtStyle, stylesBasicMessage, styleAttributeNames.STYLE_OUTLET_LAST_MODIFIED_INTERNAL)) {
      return null;
    }
    return updateStyle(stylesBasicMessage, existingCtStyle.version, productType, ctHelpers);
};

module.exports = {
  updateStyleOutlet: addRetries(updateStyleOutlet, 2, console.error),
};
