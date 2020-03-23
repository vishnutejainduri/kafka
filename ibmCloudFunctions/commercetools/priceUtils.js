const { getExistingCtStyle, getCtStyleAttribute, updateStyle, getProductType } = require('./styleUtils');
const { attributeNames } = require('./constants');
const { generateUpdateFromParsedMessage } = require('../lib/parsePriceMessage');

const preparePriceUpdate = async (ctHelpers, productTypeId, priceUpdate) => {
    const existingCtStyle = await getExistingCtStyle(priceUpdate.styleId, ctHelpers);

    if (!existingCtStyle) {
      // the given style isn't currently stored in CT; can't update price right now
      return null;
    }

    const priceData = {
      onlineSalePrice: getCtStyleAttribute(existingCtStyle, attributeNames.ONLINE_SALE_PRICE)
    };
    const styleData = {
      originalPrice: getCtStyleAttribute(existingCtStyle, attributeNames.ORIGINAL_PRICE)
    };

    priceUpdate.newRetailPrice = priceUpdate.newRetailPrice
                                  ? Math.round(priceUpdate.newRetailPrice * 100) //conversion to cents for CT comparison
                                  : null
    priceUpdate.originalPrice = styleData.originalPrice
                                  ? Math.round(styleData.originalPrice * 100) //conversion to cents for CT comparison
                                  : null

    const updatedPrice = generateUpdateFromParsedMessage (priceUpdate, priceData, styleData);
    updatedPrice.ctStyleVersion = existingCtStyle.version;
    updatedPrice.id = priceUpdate.styleId;

    const priceHasNotChanged = (updatedPrice.onlineSalePrice === priceData.onlineSalePrice
                                && updatedPrice.currentPrice === priceData.currentPrice)
    if (priceHasNotChanged) {
        return null;
    }

    return updatedPrice;
};

const updateStylePrice = async (ctHelpers, productTypeId, updatedPrice) => {
    const productType = await getProductType(productTypeId, ctHelpers);

    return updateStyle(updatedPrice, updatedPrice.ctStyleVersion, productType, ctHelpers);
};

module.exports = {
  preparePriceUpdate,
  updateStylePrice
};
