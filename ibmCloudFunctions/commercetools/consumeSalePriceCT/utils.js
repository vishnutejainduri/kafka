const { getExistingCtStyle, createAndPublishStyle } = require('../styleUtils');
const { priceAttributeNames, isStaged, currencyCodes, entityStatus, priceTypes } = require('../constantsCt');
const { priceChangeActivityTypes } = require('../../constants');
const convertToCents = (amount) => Math.round(amount * 100)

const getAllVariantPrices = (existingCtStyle) => {
  const variantPrices = [];
  const masterVariant = existingCtStyle.masterData[entityStatus].masterVariant
  const masterVariantPrices = {
    variantId: masterVariant.id,
    prices: masterVariant.prices
  };
  variantPrices.push(masterVariantPrices);

  const otherVariants = existingCtStyle.masterData[entityStatus].variants
  otherVariants.forEach((variant) => {
    const variantPrice = {
      variantId: variant.id,
      prices: variant.prices
    };
    variantPrices.push(variantPrice);
  });

  return variantPrices;
};

const getTime = processDateCreated => processDateCreated.getTime
  ? processDateCreated.getTime()
  : (new Date(processDateCreated)).getTime()

const existingCtPriceIsNewer = (existingCtPrice, parsedPriceMessage) => {
  const existingCtPriceCustomAttributes = existingCtPrice.custom;
  const existingProcessDateCreated = existingCtPriceCustomAttributes && existingCtPriceCustomAttributes.fields && existingCtPriceCustomAttributes.fields[priceAttributeNames.PROCESS_DATE_CREATED]

  if (!existingProcessDateCreated) return false;
  
  return getTime(existingProcessDateCreated) > getTime(parsedPriceMessage[priceAttributeNames.PROCESS_DATE_CREATED]);
};

const getExistingCtOriginalPrice = (variantPrice) => {
  const existingCtOriginalPrice = variantPrice.prices.find((price) => price.custom && price.custom.fields[priceAttributeNames.PRICE_TYPE] === priceTypes.ORIGINAL_PRICE);
  return existingCtOriginalPrice;
};

const getExistingCtPermanentMarkdown = (variantPrice) => {
  const existingCtPermanentMarkdown = variantPrice.prices.find((price) => price.custom && price.custom.fields[priceAttributeNames.PRICE_TYPE] === priceTypes.PERMANENT_MARKDOWN);
  return existingCtPermanentMarkdown;
};

const getExistingCtPrice = (variantPrice, parsedPriceMessage) => {
  const existingCtPrice = variantPrice.prices.find((price) => price.custom && price.custom.fields[priceAttributeNames.PRICE_CHANGE_ID] === parsedPriceMessage[priceAttributeNames.PRICE_CHANGE_ID]);
  return existingCtPrice;
};

const getCustomFieldsForSalePrice = (parsedPriceMessage) => {
  return Object.values(priceAttributeNames).reduce((fields, attribute) => {
    fields[attribute] = parsedPriceMessage[attribute];
    return fields
  }, {})
};

/**
 * @param {object} parsedPriceMessage
 * @param {{ variantId: string, prices: object[] }} variantPrice
 */
const getActionsForVariantPrice = (parsedPriceMessage, variantPrice) => {
  const existingCtPrice = getExistingCtPrice(variantPrice, parsedPriceMessage);
  if (existingCtPrice && existingCtPriceIsNewer(existingCtPrice, parsedPriceMessage)) {
    return [];
  }
  if (parsedPriceMessage.activityType === priceChangeActivityTypes.APPROVED || parsedPriceMessage.activityType === priceChangeActivityTypes.CREATED) {
    const priceUpdate = {
      price: {
        country: 'CA',
        validFrom: parsedPriceMessage.startDate,
        validUntil: parsedPriceMessage.endDate,
        value: {
          currencyCode: currencyCodes.CAD,
          centAmount: convertToCents(parsedPriceMessage.newRetailPrice) 
        },
        custom: {
          type: {
            key: 'priceCustomFields'
          },
          fields: getCustomFieldsForSalePrice(parsedPriceMessage)
        }
      },
      staged: isStaged
    };
    if (existingCtPrice) {
      priceUpdate.action = 'changePrice';
      priceUpdate.priceId = existingCtPrice.id;
    } else {
      priceUpdate.action = 'addPrice';
      priceUpdate.variantId = variantPrice.variantId;
    }
    return [priceUpdate]
  } else if (parsedPriceMessage.activityType === priceChangeActivityTypes.DELETED) {
    if (existingCtPrice) {
      const priceUpdate = {
        action: 'removePrice',
        priceId: existingCtPrice.id,
        staged: isStaged
      }
      return [priceUpdate]
    } else {
      throw new Error ('Price does not exist');
    }
  } else {
    throw new Error (`Activity type ${parsedPriceMessage.activityType} is not recognized!`);
  }
}

const getActionsForSalePrice = (parsedPriceMessage, allVariantPrices) => allVariantPrices
  .reduce((allActions, variantPrice) => [
    ...allActions,
    ...getActionsForVariantPrice(parsedPriceMessage, variantPrice)
  ], []);

const updateStyleSalePrice = async (ctHelpers, productTypeId, parsedPriceMessage) => {
    const { client, requestBuilder } = ctHelpers;

    let existingCtStyle = await getExistingCtStyle(parsedPriceMessage.styleId, ctHelpers);

    if (!existingCtStyle) {
      // create dummy style where none exists
      existingCtStyle = (await createAndPublishStyle ({ id: parsedPriceMessage.styleId, name: { 'en-CA': '', 'fr-CA': '' } }, { id: productTypeId }, null, ctHelpers)).body
    }
    
    const allVariantPrices = getAllVariantPrices(existingCtStyle);
    const actions = getActionsForSalePrice(parsedPriceMessage, allVariantPrices);

    return client.execute({
      method: 'POST',
      uri: requestBuilder.products.byKey(parsedPriceMessage.styleId).build(),
      body: JSON.stringify({ version: existingCtStyle.version, actions })
    }).catch(error => {
      const overlappingTemporaryMarkdownError = error.body.errors.filter(error => error.code === 'DuplicatePriceScope')[0];
      if (overlappingTemporaryMarkdownError) {
        console.error(overlappingTemporaryMarkdownError.message); //for reporting/logging/searching
        return null;
      } else {
        throw error;
      }
    })
};

module.exports = {
  updateStyleSalePrice,
  getAllVariantPrices,
  convertToCents,
  getExistingCtOriginalPrice,
  getExistingCtPermanentMarkdown,
  // internal functions exported for tests follows:
  getActionsForVariantPrice,
  getActionsForSalePrice
};
