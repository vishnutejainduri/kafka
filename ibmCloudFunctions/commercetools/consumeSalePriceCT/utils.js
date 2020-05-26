const { getExistingCtStyle, createAndPublishStyle } = require('../styleUtils');
const { priceAttributeNames, isStaged, currencyCodes, entityStatus } = require('../constantsCt');

const convertToCents = (amount) => Math.round(amount * 100)

const getAllVariantPrices = (existingCtStyle) => {
  const variantPrices = [];

  const priceObjMaster = existingCtStyle.masterData[entityStatus].masterVariant
  const relevantPriceObjMaster = {
    variantId: priceObjMaster.id,
    prices: priceObjMaster.prices
  };
  variantPrices.push(relevantPriceObjMaster);

  //current/staged price for all variants
  const ctStyleVariants = existingCtStyle.masterData[entityStatus].variants
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
  if (!existingCtPrice) return false;
  const existingCtPriceCustomAttributes = existingCtPrice.custom;
  if (!existingCtPriceCustomAttributes) return false;

  const existingCtPriceDate = new Date(existingCtPriceCustomAttributes.fields[priceAttributeNames.PROCESS_DATE_CREATED]);

  return existingCtPriceDate.getTime() >= givenPrice[priceAttributeNames.PROCESS_DATE_CREATED].getTime();
};

const getExistingCtOriginalPrice = (variantPrice) => {
  const existingCtOriginalPrice = variantPrice.prices.find((price) => price.custom && price.custom.fields[priceAttributeNames.IS_ORIGINAL_PRICE]);
  return existingCtOriginalPrice;
};

const getExistingCtPrice = (variantPrice, givenPrice) => {
  const existingCtPrice = variantPrice.prices.find((price) => price.custom && price.custom.fields[priceAttributeNames.PRICE_CHANGE_ID] === givenPrice[priceAttributeNames.PRICE_CHANGE_ID]);
  return existingCtPrice;
};

const getCustomFieldActionForSalePrice = (existingCtPrice, updatedPrice) => {
    const customAttributesToUpdate = Object.values(priceAttributeNames);

    let customTypeUpdateAction = { 
        action: 'setProductPriceCustomType',
        type: {
          key: 'priceCustomFields'
        },
        priceId: existingCtPrice.id,
        fields: {}
    }

    customAttributesToUpdate.forEach(attribute => {
      customTypeUpdateAction.fields[attribute] = updatedPrice[attribute];
    })

    return customTypeUpdateAction;
};

const getActionsForSalePrice = (updatedPrice, existingCtStyle) => {
  const allVariantPrices = getAllVariantPrices(existingCtStyle);
  const priceUpdateActions = allVariantPrices.map((variantPrice) => {
    let customFieldUpdateAction = null;
    const existingCtPrice = getExistingCtPrice(variantPrice, updatedPrice);
    if (existingCtPriceIsNewer(existingCtPrice, updatedPrice)) {
      return [];
    }

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
      if (existingCtPrice) {
        priceUpdate.action = 'changePrice';
        priceUpdate.priceId = existingCtPrice.id;
        priceUpdate.price.validFrom = new Date(updatedPrice.startDate);
        priceUpdate.price.validUntil = new Date(updatedPrice.endDate);
        customFieldUpdateAction = getCustomFieldActionForSalePrice(existingCtPrice, updatedPrice);
      } else {
        priceUpdate.action = 'addPrice';
        priceUpdate.variantId = variantPrice.variantId;
        priceUpdate.price.validFrom = new Date(updatedPrice.startDate);
        priceUpdate.price.validUntil = new Date(updatedPrice.endDate);
        priceUpdate.price.custom = {
          type: {
            key: 'priceCustomFields'
          },
          fields: {
            processDateCreated: new Date(updatedPrice.processDateCreated),
            priceChangeId: updatedPrice.priceChangeId,
            isOriginalPrice: updatedPrice.isOriginalPrice
          }
        };
      }
    } else if (updatedPrice.activityType === 'D') {
      if (existingCtPrice) {
        priceUpdate.action = 'removePrice';
        priceUpdate.priceId = existingCtPrice.id;
        delete priceUpdate.price;
      } else {
        throw new Error ('Price does not exist');
      }
    } else {
      return [];
    }

    return [priceUpdate, customFieldUpdateAction].filter(Boolean);
  });

  const allUpdateActions = priceUpdateActions.reduce((finalActions, currentActions) => [...finalActions, ...currentActions], []);

  return allUpdateActions;
};

const updateStyleSalePrice = async (ctHelpers, productTypeId, updatedPrice) => {
    const { client, requestBuilder } = ctHelpers;

    let existingCtStyle = await getExistingCtStyle(updatedPrice.styleId, ctHelpers);

    if (!existingCtStyle) {
      // create dummy style where none exists
      existingCtStyle = (await createAndPublishStyle ({ id: updatedPrice.styleId, name: { 'en-CA': '', 'fr-CA': '' } }, { id: productTypeId }, null, ctHelpers)).body;
    }

    const method = 'POST';
    const uri = requestBuilder.products.byKey(updatedPrice.styleId).build();
    const actions = getActionsForSalePrice(updatedPrice, existingCtStyle);
    const body = JSON.stringify({ version: existingCtStyle.version, actions });

    return client.execute({ method, uri, body });
};

module.exports = {
  updateStyleSalePrice,
  getAllVariantPrices,
  convertToCents,
  getExistingCtOriginalPrice,
  getCustomFieldActionForSalePrice
};
