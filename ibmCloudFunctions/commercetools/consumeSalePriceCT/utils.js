const { getExistingCtStyle, getCtStyleAttribute, updateStyle, getProductType } = require('../styleUtils');
const { styleAttributeNames, isStaged, currencyCodes } = require('../constantsCt');

const convertToCents = (amount) => Math.round(amount * 100)

const getAllVariantPrices = (existingCtStyle) => {
  const variantPrices = [];

  //current/staged price for master variant
  const priceObjMaster = existingCtStyle.masterData.hasStagedChanges
    ? existingCtStyle.masterData.staged.masterVariant
    : existingCtStyle.masterData.current.masterVariant
  const relevantPriceObjMaster = {
    variantId: priceObjMaster.id,
    prices: priceObjMaster.prices
  };
  variantPrices.push(relevantPriceObjMaster);

  //current/staged price for all variants
  const ctStyleVariants = existingCtStyle.masterData.hasStagedChanges
    ? existingCtStyle.masterData.staged.variants
    : existingCtStyle.masterData.current.variants
  ctStyleVariants.forEach((variant) => {
    const relevantPriceObj = {
      variantId: variant.id,
      prices: variant.prices
    };
    variantPrices.push(relevantPriceObj);
  });

  return variantPrices;
};

/*const generateUpdateFromParsedMessages = (priceUpdate, priceData, styleData, variantPrices) => {
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
                                  ? convertToCents(priceUpdate.newRetailPrice)
                                  : null
    priceUpdate.originalPrice = styleData.originalPrice
                                  ? convertToCents(styleData.originalPrice)
                                  : null

    const updatedPrices = generateUpdateFromParsedMessages (priceUpdate, priceData, styleData, variantPrices)

    if (updatedPrices.variantPrices.length === 0) {
        return null;
    }

    updatedPrices.version = existingCtStyle.version;
    updatedPrices.id = priceUpdate.styleId;

    //the following three values come from index 0, they should be identical at all times at anywhere in the index
    //since all variants should have the same pricing
    updatedPrices.onlineSalePrice =  updatedPrices.variantPrices[0].updatedPrice.onlineSalePrice;
    updatedPrices.isOnlineSale =  updatedPrices.variantPrices[0].updatedPrice.isOnlineSale;
    updatedPrices.onlineDiscount =  updatedPrices.variantPrices[0].updatedPrice.onlineDiscount;


    return updatedPrices;
};*/

const getActionsForSalePrice = (updatedPrice, productType, existingCtStyle) => {
  const allVariantPrices = getAllVariantPrices(existingCtStyle);
  const priceUpdateActions = allVariantPrices.map((variantPrice) => {
    const priceUpdate = {
      price: {
        value: {
          currencyCode: currencyCodes.CAD,
          centAmount: convertToCents(updatedPrice.newRetailPrice) 
        }
      },
      staged: isStaged
    };
    switch(updatedPrice.activityType) {
      case "A":
        priceUpdate.action = 'addPrice';
        priceUpdate.variantId = variantPrice.variantId;
        break;
      case "C":
        priceUpdate.action = 'changePrice';
        priceUpdate.priceId = variantPrice.price.id;
        break;
      case "D":
        break;
      default:
    } 
  });

  const allUpdateActions = [...priceUpdateActions].filter(Boolean);

  return allUpdateActions;
};

const updateStyleSalePrice = async (ctHelpers, productTypeId, updatedPrice) => {
    const { client, requestBuilder } = ctHelpers;

    const productType = await getProductType(productTypeId, ctHelpers);
    const existingCtStyle = await getExistingCtStyle(updatedPrice.styleId, ctHelpers);

    if (!existingCtStyle) {
      throw new ('Style does not exist');
    }

    const method = 'POST';
    const uri = requestBuilder.products.byKey(updatedPrice.styleId).build();
    const actions = getActionsForSalePrice(updatedPrice, productType, existingCtStyle);
    const body = JSON.stringify({ version: existingCtStyle.version, actions });

    return client.execute({ method, uri, body });
};

module.exports = {
  preparePriceUpdate,
  updateStylePrice,
};
