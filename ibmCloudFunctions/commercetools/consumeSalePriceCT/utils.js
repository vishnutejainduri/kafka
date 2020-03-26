const { addRetries } = require('../../product-consumers/utils');
const { getExistingCtStyle, getCtStyleAttribute, updateStyle, getProductType } = require('../styleUtils');
const { styleAttributeNames } = require('../constantsCt');
const { generateUpdateFromParsedMessage } = require('../../lib/parsePriceMessage');

const getAllVariantPrices = (existingCtStyle) => {
  const variantPrices = [];

  //current/staged price for master variant
  const priceObjMaster = existingCtStyle.masterData.hasStagedChanges
    ? existingCtStyle.masterData.staged.masterVariant
    : existingCtStyle.masterData.current.masterVariant
  const relevantPriceObjMaster = {
    variantId: priceObjMaster.id,
    price: priceObjMaster.prices[0]
  };
  variantPrices.push(relevantPriceObjMaster);

  //current/staged price for all variants
  const ctStyleVariants = existingCtStyle.masterData.hasStagedChanges
    ? existingCtStyle.masterData.staged.variants
    : existingCtStyle.masterData.current.variants
  ctStyleVariants.forEach((variant) => {
    const relevantPriceObj = {
      variantId: variant.id,
      price: variant.prices[0]
    };
    variantPrices.push(relevantPriceObj);
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

    const variantPrices = getAllVariantPrices(existingCtStyle);

    const onlineSalePriceCurrent = getCtStyleAttribute(existingCtStyle, styleAttributeNames.ONLINE_SALE_PRICE);
    const priceData = {
      onlineSalePrice: onlineSalePriceCurrent ? onlineSalePriceCurrent.centAmount : null,
    };
    const originalPriceCurrent = getCtStyleAttribute(existingCtStyle, styleAttributeNames.ORIGINAL_PRICE);
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
  updateStylePrice: addRetries(updateStylePrice, 2, console.error),
};
