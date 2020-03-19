const { getExistingCtStyle } = require('./styleUtils');
const { generateUpdateFromParsedMessage } = require('../lib/parsePriceMessage');

const preparePriceUpdate = async (ctHelpers, productTypeId, priceUpdate) => {
    const existingCtStyle = await getExistingCtStyle(priceUpdate.id, ctHelpers);

    if (!existingCtStyle) {
      // the given style isn't currently stored in CT; can't update price right now
      return null;
    }

    console.log('existingCtStyle', JSON.stringify(existingCtStyle));
    const stagedOriginalPriceString = ctStyle.masterData.staged ? getCtStyleAttributeValue(ctStyle, attributeNames.STYLE_LAST_MODIFIED_INTERNAL, false) : null;
    const currentOriginalPriceString = ctStyle.masterData.current ? getCtStyleAttributeValue(ctStyle, attributeNames.STYLE_LAST_MODIFIED_INTERNAL, true) : null;

    const priceData = {
      
    };
    const styleData = {
    };

    const updatedPrice = generateUpdateFromParsedMessage (update, priceData, styleData);
    return updatedPrice;
};

module.exports = {
  preparePriceUpdate
};
