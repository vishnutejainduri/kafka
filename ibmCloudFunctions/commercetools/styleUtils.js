const { addRetries } = require('../product-consumers/utils');
const { styleAttributeNames, currencyCodes, languageKeys, STAGED } = require('./constantsCt');

const categoryNameToKey = (categoryName) => categoryName.replace(/[^a-zA-Z0-9_]/g, '')

const createCategory = async (categoryKey, categoryName, parentCategory, { client, requestBuilder }) => {
  const method = 'POST';
  const uri = requestBuilder.categories.build();

  const body = {
    key: categoryKey,
    name: categoryName,
    slug: {
      [languageKeys.ENGLISH]: categoryKey,
      [languageKeys.FRENCH]: categoryKey
    }
  };

  if (parentCategory) {
    body.parent = {
      id: parentCategory.id,
      typeId: 'category'
    };
  }

  const requestBody = JSON.stringify(body);

  const response = await client.execute({ method, uri, body: requestBody });
  return response.body;
};

const getCategory = async (category, { client, requestBuilder }) => {
  const method = 'GET';

  const uri = requestBuilder.categories.byKey(category).build();

  try {
    const response = await client.execute({ method, uri });
    return response.body;
  } catch (err) {
      if (err.code === 404) return null; 
      throw err;
  }
};

const getCategories = async (style, ctHelpers) => {
  const level1CategoryKey = categoryNameToKey(style.level1Category[languageKeys.ENGLISH]);
  const level2CategoryKey = categoryNameToKey(style.level1Category[languageKeys.ENGLISH] + style.level2Category[languageKeys.ENGLISH]);
  const level3CategoryKey = categoryNameToKey(style.level1Category[languageKeys.ENGLISH] + style.level2Category[languageKeys.ENGLISH] + style.level3Category[languageKeys.ENGLISH]);

  const categories = await Promise.all([
    getCategory(level1CategoryKey, ctHelpers),
    getCategory(level2CategoryKey, ctHelpers),
    getCategory(level3CategoryKey, ctHelpers)
  ]);

  if (!categories[0]) categories[0] = await createCategory(level1CategoryKey, style.level1Category, null, ctHelpers);
  if (!categories[1]) categories[1] = await createCategory(level2CategoryKey, style.level2Category, categories[0], ctHelpers);
  if (!categories[2]) categories[2] = await createCategory(level3CategoryKey, style.level3Category, categories[1], ctHelpers);

  return categories;
};

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

const formatAttributeValue = (style, actionObj, attribute, attributeType) => {
  if (attributeType === 'money') {
    actionObj.value = {
      currencyCode: currencyCodes.CAD,
      centAmount: style[attribute]
    }
    if (!style[attribute]) delete actionObj.value;
  }

  return actionObj;
};

// Returns true iff the given attribute is a custom attribute on the HR product
// type defined in CT
const isCustomAttribute = attribute => {
  const styleCustomAttributes = Object.values(styleAttributeNames);
  return styleCustomAttributes.includes(attribute);
};

// Returns an array of actions, each of which tells CT to update a different
// attribute of the given style
const getActionsFromStyle = (style, productType, categories, existingCtStyle) => {
  const customAttributesToUpdate = Object.keys(style).filter(isCustomAttribute);

  const customAttributeUpdateActions = customAttributesToUpdate.map(attribute => {
      const attributeTypeOj = productType.attributes.find((attributeType) => attributeType.name === attribute)
      const attributeType = attributeTypeOj ? attributeTypeOj.type.name : null;
      let actionObj = {
        action: 'setAttributeInAllVariants',
        name: attribute,
        value: style[attribute],
        staged: STAGED
      };
      
      actionObj = formatAttributeValue(style, actionObj, attribute, attributeType);

      return actionObj;
    }
  );

  // `name` and `description` aren't custom attributes of products in CT, so
  // their update actions differ from the others
  const nameUpdateAction = style.name
    ? { action: 'changeName', name: style.name, staged: STAGED }
    : null;
  
  const descriptionUpdateAction = style.marketingDescription
    ? { action: 'setDescription', description: style.marketingDescription, staged: STAGED }
    : null;

  // handle categories
  const existingCtStyleData = existingCtStyle.masterData.hasStagedChanges
    ? existingCtStyle.masterData.staged
    : existingCtStyle.masterData.current
  const existingCategoryIds = existingCtStyleData.categories
    ? existingCtStyleData.categories.map(category => category.id)
    : null
  const categoryIds = categories
    ? categories.map(category => category.id)
    : null

  // category actions, remove only those not present in coming request
  const categoriesRemoveAction = categoryIds && existingCategoryIds
    ? existingCategoryIds.filter(categoryId => !categoryIds.includes(categoryId))
        .map(categoryId => ({ action: 'removeFromCategory', category: { id: categoryId, typeId: 'category', staged: STAGED } }))
    : [];

  // category actions, add only those not present already in CT
  const categoriesAddAction = categoryIds && existingCategoryIds
    ? categoryIds.filter(categoryId => !existingCategoryIds.includes(categoryId))
      .map(categoryId => ({ action: 'addToCategory', category: { id: categoryId, typeId: 'category' }, staged: STAGED }))
    : [];

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
        },
        staged: STAGED
    }))
      : [];

  const allUpdateActions = [...customAttributeUpdateActions, nameUpdateAction, descriptionUpdateAction, ...currentPriceActions, 
    ...categoriesAddAction, ...categoriesRemoveAction].filter(Boolean);

  return allUpdateActions;
};

const updateStyle = async (style, existingCtStyle, productType, categories, { client, requestBuilder }) => {
  if (!style.id) throw new Error('Style lacks required key \'id\'');
  if (!existingCtStyle.version) throw new Error('Invalid arguments: must include existing style \'version\'');

  const method = 'POST';
  const uri = requestBuilder.products.byKey(style.id).build();
  const actions = getActionsFromStyle(style, productType, categories, existingCtStyle);
  const body = JSON.stringify({ version: existingCtStyle.version, actions });

  return client.execute({ method, uri, body });
};

const getAttributesFromStyle = (style, productType) => {
  const customAttributesToCreate = Object.keys(style).filter(isCustomAttribute);
  
  return customAttributesToCreate.map(attribute => {
      const attributeType = productType.attributes.find((attributeType) => attributeType.name === attribute).type.name;
      let attributeCreation = {
        name: attribute,
        value: style[attribute]
      };

      attributeCreation = formatAttributeValue(style, attributeCreation, attribute, attributeType);
      return attributeCreation;
    }
  );
};

const createStyle = async (style, productType, categories, { client, requestBuilder }) => {
  if (!style.id) throw new Error('Style lacks required key \'id\'');

  const method = 'POST';
  const uri = requestBuilder.products.build();
  const attributes = getAttributesFromStyle(style, productType);

  const body = {
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
      attributes
    },
    // TODO: Figure out what to put for the slug. It's required and must be
    // unique, but will we even make use of it? Right now I'm just putting the
    // style ID since I know that's unique.
    slug: {
      [languageKeys.ENGLISH]: style.id,
      [languageKeys.FRENCH]: style.id
    }
  };

  if (style.originalPrice) {
    body.masterVariant.prices = [{
        value: {
          currencyCode: currencyCodes.CAD,
          centAmount: style.originalPrice
        } 
      }];
  }
  if (categories) {
    body.categories = categories.map(category => ({
      typeId: 'category',
      id: category.id
    }));
  }
  const requestBody = JSON.stringify(body);

  return client.execute({ method, uri, body: requestBody });
};

// When you create a style in CT, it starts out unpublished. You need to make
// an additional API call to tell CT to publish it.
const createAndPublishStyle = async (styleToCreate, productType, categories, ctHelpers) => {
  const { client, requestBuilder } = ctHelpers;
  const newStyle = (await createStyle(styleToCreate, productType, categories, ctHelpers)).body;

  const method = 'POST';
  const uri = requestBuilder.products.byKey(newStyle.key).build();
  const body = JSON.stringify({ version: newStyle.version, actions: [{ name: 'publish', scope: 'All' }] });

  return client.execute({ method, uri, body }); // TODO: make sure this is formatted correctly
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
const existingCtStyleIsNewer = (existingCtStyle, givenStyle, dateAttribute) => {
  const existingCtStyleDateAttributeValue = getCtStyleAttribute(existingCtStyle, dateAttribute);
  if (!existingCtStyleDateAttributeValue) return false;
  if (!givenStyle[dateAttribute]) return false;

  const existingCtStyleDate = new Date(existingCtStyleDateAttributeValue);

  return existingCtStyleDate.getTime() >= givenStyle[dateAttribute].getTime()
};

const createOrUpdateStyle = async (ctHelpers, productTypeId, style) => {
    const productType = await getProductType(productTypeId, ctHelpers);
    const existingCtStyle = await getExistingCtStyle(style.id, ctHelpers);

    if (!existingCtStyle) {
      // the given style isn't currently stored in CT, so we create a new one
      const categories = await getCategories(style, ctHelpers);
      return createStyle(style, productType, categories, ctHelpers);
    }
    if (existingCtStyleIsNewer(existingCtStyle, style, styleAttributeNames.STYLE_LAST_MODIFIED_INTERNAL)) {
      // the given style is out of date, so we don't add it to CT
      return null;
    }
    // the given style is up-to-date and an earlier version of it is already
    // stored in CT, so we just need to update its attributes
    const categories = await getCategories(style, ctHelpers);
    return updateStyle(style, existingCtStyle, productType, categories, ctHelpers);
};

module.exports = {
  createStyle,
  createAndPublishStyle,
  updateStyle,
  createOrUpdateStyle: addRetries(createOrUpdateStyle, 2, console.error),
  existingCtStyleIsNewer,
  getCtStyleAttributeValue,
  getCtStyleAttribute,
  getProductType,
  getExistingCtStyle,
  getCategory,
  getCategories,
  createCategory,
  categoryNameToKey
};
