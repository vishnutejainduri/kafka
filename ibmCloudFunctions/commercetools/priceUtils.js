const { getExistingCtStyle, getCtStyleAttribute, updateStyle } = require('./styleUtils');
const { attributeNames } = require('./constants');
const { generateUpdateFromParsedMessage } = require('../lib/parsePriceMessage');

const preparePriceUpdate = async (ctHelpers, productTypeId, priceUpdate) => {
    const existingCtStyle = await getExistingCtStyle(priceUpdate.styleId, ctHelpers);

    console.log('existingCtStyle', existingCtStyle.masterData['current'].masterVariant.attributes);

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

    const updatedPrice = generateUpdateFromParsedMessage (priceUpdate, priceData, styleData);

    const priceHasNotChanged = priceData
        ? (updatedPrice.onlineSalePrice === priceData.onlineSalePrice
            && updatedPrice.currentPrice === priceData.currentPrice)
        : (updatedPrice.onlineSalePrice === null);
    if (priceHasNotChanged) {
        return null;
    }

    updatedPrice.ctStyleVersion = existingCtStyle.version;
    updatedPrice.id = priceUpdate.styleId;
    updatedPrice.onlineSalePrice = updatedPrice.onlineSalePrice
                                  ? Math.round(updatedPrice.onlineSalePrice * 100)
                                  : null
    updatedPrice.originalPrice = updatedPrice.originalPrice
                                  ? Math.round(updatedPrice.originalPrice * 100)
                                  : null

    return updatedPrice;
};

const updateStylePrice = async (ctHelpers, productTypeId, updatedPrice) => {
    return updateStyle(updatedPrice, updatedPrice.ctStyleVersion, ctHelpers);
};

module.exports = {
  preparePriceUpdate,
  updateStylePrice
};
