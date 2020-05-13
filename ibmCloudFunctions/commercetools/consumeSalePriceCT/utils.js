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

const existingCtPriceIsNewer = (existingCtPrice, givenPrice) => {
  const existingCtOrderCustomAttributes = existingCtOrder.custom;
  if (!existingCtOrderCustomAttributes) return false;

  const existingCtOrderDate = new Date(existingCtOrderCustomAttributes.fields.orderLastModifiedDate);

  return existingCtOrderDate.getTime() >= givenOrder[orderAttributeNames.ORDER_LAST_MODIFIED_DATE].getTime();
};

const getExistingCtPrice = (variantPrice, givenPrice) => {
  const existingCtPrice = variantPrice.prices.find((price) => price.custom && price.custom.fields.priceChangeId === givenPrice.priceChangeId);
  return existingCtPrice;
};

const getActionsForSalePrice = (updatedPrice, productType, existingCtStyle) => {
  const allVariantPrices = getAllVariantPrices(existingCtStyle);
  const priceUpdateActions = allVariantPrices.map((variantPrice) => {
    const existingCtPrice = getExistingCtPrice(variantPrice, updatedPrice);
    const priceUpdate = {
      price: {
        value: {
          currencyCode: currencyCodes.CAD,
          centAmount: convertToCents(updatedPrice.newRetailPrice) 
        }
      },
      staged: isStaged
    };
    if (updatedPrice.activityType === 'A' || updatedPrice.activityType === 'C') {
    } else if (updatedPrice.activityType === 'D') {
      
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
