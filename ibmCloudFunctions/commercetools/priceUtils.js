const { getExistingCtStyle, getCtStyleAttribute, updateStyle, getProductType } = require('./styleUtils');
const { attributeNames } = require('./constantsCt');
const { generateUpdateFromParsedMessage } = require('../lib/parsePriceMessage');

const getAllVariantPrices = (existingCtStyle, current = false) => {
  const variantPrices = [];

  //current price for master variant
  const priceObjMaster = existingCtStyle
    .masterData[current ? 'current' : 'staged']
    .masterVariant
  const currentPriceObjMaster = {
    variantId: priceObjMaster.id,
    price: priceObjMaster.prices[0]
  };
  variantPrices.push(currentPriceObjMaster);

  //current price for all variants
  const ctStyleVariants = existingCtStyle
    .masterData[current ? 'current' : 'staged']
    .variants;
  ctStyleVariants.forEach((variant) => {
    const currentPriceObj = {
      variantId: variant.id,
      price: variant.prices[0]
    };
    variantPrices.push(currentPriceObj);
  });

  return variantPrices;
};

const generateUpdateFromParsedMessages = (priceUpdate, priceData, styleData, variantPrices) => {
    variantPrices = variantPrices.map ((variantPrice) => {
      priceData.currentPrice = variantPrice.price ? variantPrice.price.value.centAmount : null
      const updatedPrice = generateUpdateFromParsedMessage (priceUpdate, priceData, styleData);
      const priceHasNotChanged = (updatedPrice.onlineSalePrice === priceData.onlineSalePrice
                                  && updatedPrice.currentPrice === priceData.currentPrice)

      if (priceHasNotChanged) return null;
    
      variantPrice.updatedPrice = updatedPrice;  

      return variantPrice;
    }).filter(variantPrice => variantPrice)
    return { variantPrices };
};

const preparePriceUpdate = async (ctHelpers, productTypeId, priceUpdate) => {
    const existingCtStyle = await getExistingCtStyle(priceUpdate.styleId, ctHelpers);

    if (!existingCtStyle) {
      // the given style isn't currently stored in CT; can't update price right now
      return null;
    }

    const variantPrices = getAllVariantPrices(existingCtStyle, false) || getAllVariantPrices(existingCtStyle, true);

    const onlineSalePriceCurrent = getCtStyleAttribute(existingCtStyle, attributeNames.ONLINE_SALE_PRICE);
    const priceData = {
      onlineSalePrice: onlineSalePriceCurrent ? onlineSalePriceCurrent.centAmount : null,
    };
    const originalPriceCurrent = getCtStyleAttribute(existingCtStyle, attributeNames.ORIGINAL_PRICE);
    const styleData = {
      originalPrice: originalPriceCurrent ? originalPriceCurrent.centAmount : null
    };

    priceUpdate.newRetailPrice = priceUpdate.newRetailPrice
                                  ? Math.round(priceUpdate.newRetailPrice * 100) //conversion to cents for CT comparison
                                  : null
    priceUpdate.originalPrice = styleData.originalPrice
                                  ? Math.round(styleData.originalPrice * 100) //conversion to cents for CT comparison
                                  : null

    const updatedPrices = generateUpdateFromParsedMessages (priceUpdate, priceData, styleData, variantPrices)
    console.log('updatedPrice.variantPrices', updatedPrices.variantPrices);

    if (updatedPrices.variantPrices.length === 0) {
        return null;
    }

    updatedPrices.ctStyleVersion = existingCtStyle.version;
    updatedPrices.id = priceUpdate.styleId;
    //the following three values come from index 0, they should be identical at all times at anywhere in the index
    //since all variants should have the same pricing
    updatedPrices.onlineSalePrice =  updatedPrices.variantPrices[0].updatedPrice.onlineSalePrice;
    updatedPrices.isOnlineSale =  updatedPrices.variantPrices[0].updatedPrice.isOnlineSale;
    updatedPrices.onlineDiscount =  updatedPrices.variantPrices[0].updatedPrice.onlineDiscount;

    return updatedPrices;
};

const updateStylePrice = async (ctHelpers, productTypeId, updatedPrice) => {
    const productType = await getProductType(productTypeId, ctHelpers);

    return updateStyle(updatedPrice, updatedPrice.ctStyleVersion, productType, ctHelpers);
};

module.exports = {
  preparePriceUpdate,
  updateStylePrice
};
