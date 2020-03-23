const { getExistingCtStyle } = require('../utils');
const { attributeNames } = require('../constants');

const isSkuAttributeThatShouldUpdate = attribute => {
  const skuAttributesThatShouldUpdate = [
    attributeNames.COLOR_ID,
    attributeNames.SIZE_ID,
    attributeNames.SIZE,
    attributeNames.SKU_LAST_MODIFIED_INTERNAL
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

  return client.execute({ method, uri, body });
};

const updateSku = (sku, version, { client, requestBuilder }) => {
  const method = 'POST';
  const uri = requestBuilder.products.byKey(sku.styleId).build();
  const body = formatSkuRequestBody(sku, version, false);

  return client.execute({ method, uri, body });
};

// Note: This ignores the master variant, which is a placeholder that doesn't
// correspond to an actual SKU
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
  const ctSkuLastModifiedString = getCtSkuAttributeValue(existingCtSku, attributeNames.SKU_LAST_MODIFIED_INTERNAL);
  if (!ctSkuLastModifiedString) throw new Error('CT product variant lacks last modified date');
  if (!givenSku.skuLastModifiedInternal) throw new Error('JESTA SKU lacks last modified date');

  const ctSkuLastModifiedDate = new Date(ctSkuLastModifiedString);
  return ctSkuLastModifiedDate.getTime() > givenSku.skuLastModifiedInternal.getTime();
};

const createOrUpdateSku = async (ctHelpers, sku) => {
  const existingCtStyle = await getExistingCtStyle(sku.styleId, ctHelpers);
  console.log('existingStyle?', existingCtStyle);
  if (!existingCtStyle) throw new Error(`Style with id ${sku.styleId} does not exist in CT`);

  const existingCtStagedSku = getCtSkuFromCtStyle(sku.id, existingCtStyle, false);
  const existingCtCurrentSku = getCtSkuFromCtStyle(sku.id, existingCtStyle, true);
  const newestExistingCtSku = existingCtStagedSku || existingCtCurrentSku;
  const skuExistsInCt = Boolean(newestExistingCtSku);

  if (!skuExistsInCt) {
    return createSku(sku, existingCtStyle.version, ctHelpers);
  } if (existingCtSkuIsNewer(newestExistingCtSku, sku)) {
    return null;
  }
  return updateSku(sku, existingCtStyle.version, ctHelpers);
};

module.exports = {
  createOrUpdateSku, // TODO: wrap in with retry HOF
  formatSkuRequestBody,
  getActionsFromSku,
  existingCtSkuIsNewer,
  getCtSkuFromCtStyle
};
