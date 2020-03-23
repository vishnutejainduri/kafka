const { getExistingCtStyle, getCtStyleAttribute } = require('./styleUtils');
const { attributeNames } = require('./constants');
const { generateUpdateFromParsedMessage } = require('../lib/parsePriceMessage');

const preparePriceUpdate = async (ctHelpers, productTypeId, priceUpdate) => {
    console.log('preparePriceUpdate', priceUpdate);
    const existingCtStyle = await getExistingCtStyle(priceUpdate.styleId, ctHelpers);

    console.log('existingCtStyle', existingCtStyle);
    if (!existingCtStyle) {
      // the given style isn't currently stored in CT; can't update price right now
      return null;
    }

    console.log('existingCtStyle', JSON.stringify(existingCtStyle));
    const ctOriginalPrice = getCtStyleAttribute(existingCtStyle, attributeNames.ORIGINAL_PRICE);
    console.log(ctOriginalPrice);

    const priceData = {
      
    };
    const styleData = {
    };

    const updatedPrice = generateUpdateFromParsedMessage (priceUpdate, priceData, styleData);
    return updatedPrice;
};


module.exports = {
  preparePriceUpdate
};
