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

    updatedPrice.ctStyleVersion = existingCtStyle.version;
    updatedPrice.id = priceUpdate.styleId;
    updatedPrice.onlineSalePrice = updatedPrice.onlineSalePrice
                                  ? Math.round(updatedPrice.onlineSalePrice * 100)
                                  : null
    updatedPrice.originalPrice = updatedPrice.originalPrice
                                  ? Math.round(updatedPrice.originalPrice * 100)
                                  : null

    const updatedPrice = generateUpdateFromParsedMessage (priceUpdate, priceData, styleData);


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
