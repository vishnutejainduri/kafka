const { addRetries } = require('../product-consumers/utils');
const { styleAttributeNames, currencyCodes } = require('./constantsCt');

const getProductType = async (productTypeId, { client, requestBuilder }) => {
  const method = 'GET';

  const uri = requestBuilder.productTypes.byId(productTypeId).build();

  try {
    const response = await client.execute({ method, uri });
    return response.body;
  } catch (err) {
      if (err.code === 404) return null; 
      throw err;
  }
};

const getExistingCtStyle = async (styleId, { client, requestBuilder }) => {
  const method = 'GET';

  // HR style IDs correspond to CT product keys, not CT product IDs, so we get
  // the product by key, not by ID
  const uri = requestBuilder.products.byKey(styleId).build();

  try {
    const response = await client.execute({ method, uri });
    return response.body;
  } catch (err) {
      if (err.code === 404) return null; // indicates that style doesn't exist in CT
      throw err;
  }
};

// Returns true iff the given attribute is a custom attribute on the HR product
// type defined in CT
const isCustomAttribute = attribute => {
  const styleCustomAttributes = Object.values(styleAttributeNames);
  return styleCustomAttributes.includes(attribute);
};

// Returns an array of actions, each of which tells CT to update a different
// attribute of the given style
const getActionsFromStyle = (style, productType) => {
  const customAttributesToUpdate = Object.keys(style).filter(isCustomAttribute);

  const customAttributeUpdateActions = customAttributesToUpdate.map(attribute => {
      const attributeTypeOj = productType.attributes.find((attributeType) => attributeType.name === attribute)
      const attributeType = attributeTypeOj ? attributeTypeOj.type.name : null;
      const actionObj = {
        action: 'setAttributeInAllVariants',
        name: attribute,
        value: style[attribute]
      };
      
      if (attributeType === 'money') {
        actionObj.value = {
          currencyCode: currencyCodes.CAD,
          centAmount: style[attribute]
        }
        if (!style[attribute]) delete actionObj.value;
      }

      return actionObj;
    }
  );

  // `name` and `description` aren't custom attributes of products in CT, so
  // their update actions differ from the others
  const nameUpdateAction = style.name
    ? { action: 'changeName', name: style.name }
    : null;
  
  const descriptionUpdateAction = style.marketingDescription
    ? { action: 'setDescription', description: style.marketingDescription }
    : null;

  const currentPriceActions = style.variantPrices
      ? style.variantPrices.map((variantPrice) => ({
        action: variantPrice.price ? 'changePrice' : 'addPrice',
        priceId: variantPrice.price ? variantPrice.price.id : null,
        variantId: variantPrice.price ? null : variantPrice.variantId,
        price: {
          value: {
            currencyCode: currencyCodes.CAD,
            centAmount: variantPrice.updatedPrice.currentPrice
          }
        } 
    }))
      : null

  const allUpdateActions = (
    [...customAttributeUpdateActions, nameUpdateAction, descriptionUpdateAction].concat(currentPriceActions)
      .filter(Boolean) // removes the `null` actions, if there are any
  );

  return allUpdateActions;
};

const updateStyle = async (style, version, productType, { client, requestBuilder }) => {
  if (!style.id) throw new Error('Style lacks required key \'id\'');
  if (!version) throw new Error('Invalid arguments: must include \'version\'');

  const method = 'POST';
  const uri = requestBuilder.products.byKey(style.id).build();
  const actions = getActionsFromStyle(style, productType);
  const body = JSON.stringify({ version, actions });

  return client.execute({ method, uri, body });
};

const getAttributesFromStyle = (style, productType) => {
  const customAttributesToCreate = Object.keys(style).filter(isCustomAttribute);
  
  return customAttributesToCreate.map(attribute => {
      const attributeType = productType.attributes.find((attributeType) => attributeType.name === attribute).type.name;
      const attributeCreation = {
        name: attribute,
        value: style[attribute]
      };

      if (attributeType === 'money') {
        if (!style[attribute]) {
          delete attributeCreation.value;
        } else {
          attributeCreation.value = {
            currencyCode: currencyCodes.CAD,
            centAmount: style[attribute]
          }
        }
      }
      return attributeCreation;
    }
  );
};

const createStyle = async (style, productType, { client, requestBuilder }) => {
  if (!style.id) throw new Error('Style lacks required key \'id\'');

  const method = 'POST';
  const uri = requestBuilder.products.build();
  const attributes = getAttributesFromStyle(style, productType);

  const body = JSON.stringify({
    key: style.id, // the style ID is stored as a key, since we can't set a custom ID in CT
    name: style.name,
    description: style.marketingDescription,
    productType: {
      typeId: 'product-type',
      id: productType.id
    },
    // Since CT attributes apply only at the product variant level, we can't
    // store attribute values at the level of products. So to store the
    // associated with a style that has no SKUs associated with it yet, we need
    // to create a dummy product variant.
    masterVariant: {
      attributes,
      prices: [{
        value: {
          currencyCode: currencyCodes.CAD,
          centAmount: style.originalPrice
        } 
      }]
    },
    // TODO: Figure out what to put for the slug. It's required and must be
    // unique, but will we even make use of it? Right now I'm just putting the
    // style ID since I know that's unique.
    slug: {
      'en-CA': style.id,
      'fr-CA': style.id
    }
  });

  return client.execute({ method, uri, body });
};

/**
 * Returns the value of the attribute in the given CT style. The value is taken
 * from the master variant. Returns `undefined` if the attribute does not exist.
 * @param {Object} ctStyle The product as stored in CT.
 * @param {String} attributeName Name of the attribute whose value should be returned.
 * @param {Boolean} current Indicates whether to return the value from the current product or the staged product.
 */
const getCtStyleAttributeValue = (ctStyle, attributeName, current = false) => {
  const foundAttribute =  (
    ctStyle
    .masterData[current ? 'current' : 'staged']
    .masterVariant
    .attributes
    .find(attribute => attribute.name === attributeName)
  );

  if (!foundAttribute) return undefined;
  return foundAttribute.value;
};

const getCtStyleAttribute = (ctStyle, attributeName) => {
  const stagedAttribute = ctStyle.masterData.staged ? getCtStyleAttributeValue(ctStyle, attributeName, false) : null;
  const currentAttribute = ctStyle.masterData.current ? getCtStyleAttributeValue(ctStyle, attributeName, true) : null;
  const attribute = stagedAttribute || currentAttribute;

  if (!attribute) return null;
  return attribute;
};

// Used to determine whether we should update the style in CT. Deals with race
// conditions.
const existingCtStyleIsNewer = (existingCtStyle, givenStyle) => {
  const existingCtStyleDate = new Date(getCtStyleAttribute(existingCtStyle, styleAttributeNames.STYLE_LAST_MODIFIED_INTERNAL));
  if (!existingCtStyleDate) throw new Error('CT style lacks last modified date');
  if (!givenStyle.styleLastModifiedInternal) throw new Error('JESTA style lacks last modified date');

  return existingCtStyleDate.getTime() > givenStyle.styleLastModifiedInternal.getTime();
};

const createOrUpdateStyle = async (ctHelpers, productTypeId, style) => {
    const productType = await getProductType(productTypeId, ctHelpers);
    const existingCtStyle = await getExistingCtStyle(style.id, ctHelpers);

    if (!existingCtStyle) {
      // the given style isn't currently stored in CT, so we create a new one
      return createStyle(style, productType, ctHelpers);
    }
    if (existingCtStyleIsNewer(existingCtStyle, style)) {
      // the given style is out of date, so we don't add it to CT
      return null;
    }
    // the given style is up-to-date and an earlier version of it is already
    // stored in CT, so we just need to update its attributes
    return updateStyle(style, existingCtStyle.version, productType, ctHelpers);
};

module.exports = {
  createStyle,
  updateStyle,
  createOrUpdateStyle: addRetries(createOrUpdateStyle, 2, console.error),
  existingCtStyleIsNewer,
  getCtStyleAttributeValue,
  getCtStyleAttribute,
  getProductType,
  getExistingCtStyle
};
