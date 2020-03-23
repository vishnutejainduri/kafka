const { addRetries } = require('../product-consumers/utils');
const { attributeNames } = require('./constants');

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
  const customAttributes = [
    'season',
    'brandName',
    'construction',
    'fabricAndMaterials',
    'styleAndMeasurements',
    'careInstructions',
    'advice',
    'webStatus',
    'vsn',
    'styleLastModifiedInternal'
  ];

  return customAttributes.includes(attribute);
};

// Returns an array of actions, each of which tells CT to update a different
// attribute of the given style
const getActionsFromStyle = style => {
  const customAttributesToUpdate = Object.keys(style).filter(isCustomAttribute);

  const customAttributeUpdateActions = customAttributesToUpdate.map(attribute => ({
      action: 'setAttributeInAllVariants',
      name: attribute,
      value: style[attribute]
    })
  );

  // `name` and `description` aren't custom attributes of products in CT, so
  // their update actions differ from the others
  const nameUpdateAction = style.name
    ? { action: 'changeName', name: style.name }
    : null;
  
  const descriptionUpdateAction = style.marketingDescription
    ? { action: 'setDescription', description: style.marketingDescription }
    : null;

  const allUpdateActions = (
    [...customAttributeUpdateActions, nameUpdateAction, descriptionUpdateAction]
      .filter(Boolean) // removes the `null` actions, if there are any
  );

  return allUpdateActions;
};

const updateStyle = async (style, version, { client, requestBuilder }) => {
  if (!style.id) throw new Error('Style lacks required key \'id\'');
  if (!version) throw new Error('Invalid arguments: must include \'version\'');

  const method = 'POST';
  const uri = requestBuilder.products.byKey(style.id).build();
  const actions = getActionsFromStyle(style);
  const body = JSON.stringify({ version, actions });

  return client.execute({ method, uri, body });
};

const getAttributesFromStyle = style => {
  const customAttributesToCreate = Object.keys(style).filter(isCustomAttribute);
  
  return customAttributesToCreate.map(attribute => ({
      name: attribute,
      value: style[attribute]
    })
  );
};

const createStyle = async (style, productTypeId, { client, requestBuilder }) => {
  if (!style.id) throw new Error('Style lacks required key \'id\'');

  const method = 'POST';
  const uri = requestBuilder.products.build();
  const attributes = getAttributesFromStyle(style);

  const body = JSON.stringify({
    key: style.id, // the style ID is stored as a key, since we can't set a custom ID in CT
    name: style.name,
    description: style.marketingDescription,
    productType: {
      typeId: 'product-type',
      id: productTypeId
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
      'en-CA': style.id,
      'fr-CA': style.id
    }
  });

  return client.execute({ method, uri, body });
};

/**
 * Returns the value of the attribute in the given CT style. The value is taken
 * from the master variant. Throws an error if the attribute is not found.
 * @param {Object} ctStyle The product as stored in CT.
 * @param {String} attributeName Name of the attribute whose value should be returned.
 * @param {Boolean} current Indicates whether to return the value from the current product or the staged product.
 */
const getCtStyleAttributeValue = (ctStyle, attributeName, current = false) => (
  ctStyle
    .masterData[current ? 'current' : 'staged']
    .masterVariant
    .attributes
    .find(attribute => attribute.name === attributeName)
    .value
);

const getCtStyleDate = ctStyle => {
  const stagedDateString = ctStyle.masterData.staged ? getCtStyleAttributeValue(ctStyle, attributeNames.STYLE_LAST_MODIFIED_INTERNAL, false) : null;
  const currentDateString = ctStyle.masterData.current ? getCtStyleAttributeValue(ctStyle, attributeNames.STYLE_LAST_MODIFIED_INTERNAL, true) : null;
  const dateString = stagedDateString || currentDateString;

  if (!dateString) return null;
  return new Date(dateString);
};

// Used to determine whether we should update the style in CT. Deals with race
// conditions.
const existingCtStyleIsNewer = (existingCtStyle, givenStyle) => {
  const existingCtStyleDate = getCtStyleDate(existingCtStyle);
  if (!existingCtStyleDate) throw new Error('CT style lacks last modified date');
  if (!givenStyle.styleLastModifiedInternal) throw new Error('JESTA style lacks last modified date');

  return existingCtStyleDate.getTime() > givenStyle.styleLastModifiedInternal.getTime();
};

const createOrUpdateStyle = async (ctHelpers, productTypeId, style) => {
    const existingCtStyle = await getExistingCtStyle(style.id, ctHelpers);

    if (!existingCtStyle) {
      // the given style isn't currently stored in CT, so we create a new one
      return createStyle(style, productTypeId, ctHelpers);
    }
    if (existingCtStyleIsNewer(existingCtStyle, style)) {
      // the given style is out of date, so we don't add it to CT
      return null;
    }
    // the given style is up-to-date and an earlier version of it is already
    // stored in CT, so we just need to update its attributes
    return updateStyle(style, existingCtStyle.version, ctHelpers);
};

//
// SKU-related helpers
// TODO: move to different file
//
const isSkuAttributeThatShouldUpdate = attribute => {
  const skuAttributesThatShouldUpdate = [
    'colorId',
    'sizeId',
    'size',
    'lastModifiedDate' // TODO: change name to be sku-specific
  ];

  return skuAttributesThatShouldUpdate.includes(attribute);
};

const getActionsFromSku = sku => {
  const attributes = Object.keys(sku).filter(isSkuAttributeThatShouldUpdate);

  return attributes.map(attribute => ({
    action: 'setAttribute',
    sku: sku.id,
    name: attribute,
    value: sku[attribute]
  }));
};

const formatSkuRequestBody = (sku, version, create) => {
  const actionsThatSetAttributes = getActionsFromSku(sku);
  const actionThatCreatesASku = { action: 'addVariant',  sku: sku.id };
  const actionsIncludingCreateAction = [actionThatCreatesASku, ...actionsThatSetAttributes];

  return JSON.stringify({
    version,
    actions: create ? actionsIncludingCreateAction : actionsThatSetAttributes
  });
};

const createSku = (sku, version, { client, requestBuilder }) => {
  const method = 'POST';
  const uri = requestBuilder.products.byKey(sku.styleId).build();
  const body = formatSkuRequestBody(sku, version, true);

  console.log({ body });

  return client.execute({ method, uri, body });
};

const updateSku = (sku, version, { client, requestBuilder }) => {
  const method = 'POST';
  const uri = requestBuilder.products.byKey(sku.styleId).build();
  const body = formatSkuRequestBody(sku, version, false);

  return client.execute({ method, uri, body });
};

// Note: Does not return the master variant (which should be a placeholder that doesn't correspond to an HR SKU)
// const getSkusFromCtStyle = ctStyle => {
//   const stagedSkus = ctStyle.masterData.staged.variants;
//   const currentSkus = ctStyle.masterData.current.variants;
//   return [...stagedSkus, ...currentSkus];
// };

// Note: Does not check the master variant
const getCtSkuFromCtStyle = (skuId, ctStyle, current) => {
  const skus = ctStyle.masterData[current ? 'current' : 'staged'].variants;
  return skus.find(variant => variant.sku === skuId); // in CT, the SKU ID is simply called 'sku'
};

const getCtSkuAttributeValue = (ctSku, attributeName) => {
  try {
    return ctSku.attributes.find(attribute => attribute.name === attributeName).value;
  } catch (err) {
    if (err.message === 'Cannot read property \'value\' of undefined') {
      throw new Error(`CT SKU ${ctSku.sku} lacks attribute '${attributeName}'`);
    }
    throw err;
  }
};

const existingCtSkuIsNewer = (existingCtSku, givenSku) => {
  const ctSkuLastModifiedString = getCtSkuAttributeValue(existingCtSku, 'skuLastModifiedInternal');
  if (!ctSkuLastModifiedString) throw new Error('CT product variant lacks last modified date');
  if (!givenSku.skuLastModifiedInternal) throw new Error('JESTA SKU lacks last modified date');

  const ctSkuLastModifiedDate = new Date(ctSkuLastModifiedString);
  return ctSkuLastModifiedDate.getTime() > givenSku.skuLastModifiedInternal.getTime();
};

const createOrUpdateSku = async (ctHelpers, sku) => {
  const existingCtStyle = await getExistingCtStyle(sku.styleId, ctHelpers);
  if (!existingCtStyle) throw new Error(`Style with id ${sku.styleId} does not exist in CT`);

  const existingCtStagedSku = getCtSkuFromCtStyle(sku.id, existingCtStyle, false);
  const existingCtCurrentSku = getCtSkuFromCtStyle(sku.id, existingCtStyle, true);
  const newestExistingCtSku = existingCtStagedSku || existingCtCurrentSku;
  const skuExistsInCt = Boolean(newestExistingCtSku);

  console.log('existingCtStagedSku', existingCtStagedSku);
  console.log('existingCtCurrentSku', existingCtCurrentSku);
  console.log('newestExistingCtSku', newestExistingCtSku);
  console.log('skuExistsInCt', skuExistsInCt)

  // const existingSkus = getSkusFromCtStyle(existingCtStyle);
  // const skuExistsInCt = existingSkus.some(existingSku => existingSku.sku === sku.id); // in CT, the SKU ID is simply called 'sku'
  // TODO: Get existingSku--staged if exists, current otherwise. Need to pass into `existingCtSkuIsNewer`.

  if (!skuExistsInCt) {
    console.log('creating new sku')
    return createSku(sku, existingCtStyle.version, ctHelpers);
  } if (existingCtSkuIsNewer(newestExistingCtSku, sku)) {
    console.log('existing CT SKU is newer, so returning null')
    return null;
  }
  console.log('updating existing sku')
  return updateSku(sku, existingCtStyle.version, ctHelpers);
};


// TODO: add date checking

module.exports = {
  createStyle,
  updateStyle,
  createOrUpdateStyle: addRetries(createOrUpdateStyle, 2, console.error),
  existingCtStyleIsNewer,
  getCtStyleAttributeValue,
  createOrUpdateSku, // TODO: wrap in with retry HOF
  formatSkuRequestBody,
  getActionsFromSku,
  existingCtSkuIsNewer
};
