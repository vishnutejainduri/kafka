const { getExistingCtStyle } = require('../utils');
const { skuAttributeNames } = require('../constants');
const { addRetries } = require('../../product-consumers/utils');

const isSkuAttributeThatShouldUpdate = attribute => {
  const skuAttributesThatShouldUpdate = Object.values(skuAttributeNames);
  return skuAttributesThatShouldUpdate.includes(attribute);
};

// Returns an array of CT actions, each of which tells CT to set a different
// attribute of the given SKU
const getActionsFromSku = sku => {
  const attributes = Object.keys(sku).filter(isSkuAttributeThatShouldUpdate);

  return attributes.map(attribute => ({
    action: 'setAttribute',
    sku: sku.id,
    name: attribute,
    value: sku[attribute]
  }));
};

// Returns a CT action which tells CT to create a new SKU with the style-level
// attributes of the mater variant of the given style. These should be the same
// for each SKU, but we still need to manually copy them. Copies the most
// recent version of the mater variant's attributes, which are assumed to be the
// those in the staged version of the variant if there are staged changes.
const getCreationAction = (sku, style) => {
  const attributes = (
    style.masterData.hasStagedChanges
      ? style.masterData.staged.masterVariant.attributes
      : style.masterData.current.masterVariant.attributes
  );

  return {
    action: 'addVariant',
    sku: sku.id,
    attributes
  };
};

const formatSkuRequestBody = (sku, style, create) => {
  const actionsThatSetSkuAttributes = getActionsFromSku(sku);
  const creationAction = getCreationAction(sku, style);
  const actionsIncludingCreateActions = [creationAction, ...actionsThatSetSkuAttributes];

  return JSON.stringify({
    version: style.version,
    actions: create ? actionsIncludingCreateActions : actionsThatSetSkuAttributes
  });
};

const createSku = (sku, style, { client, requestBuilder }) => {
  const method = 'POST';
  const uri = requestBuilder.products.byKey(sku.styleId).build();
  const body = formatSkuRequestBody(sku, style, true);

  return client.execute({ method, uri, body });
};

const updateSku = (sku, style, { client, requestBuilder }) => {
  const method = 'POST';
  const uri = requestBuilder.products.byKey(sku.styleId).build();
  const body = formatSkuRequestBody(sku, style, false);

  return client.execute({ method, uri, body });
};

// Returns the matching staged SKU if one exists. Otherwise returns the
// matching current SKU if one exists, or `undefined` if no matching
// current SKU exists.
// Note: This ignores the master variant, which is a placeholder that doesn't
// correspond to an actual SKU
const getCtSkuFromCtStyle = (skuId, ctStyle) => {
  // We want the SKU with the most recent changes, which we assume is the
  // staged one, if there are staged changes
  const skus = ctStyle.masterData[ctStyle.masterData.hasStagedChanges ? 'staged' : 'current'].variants;
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
  const ctSkuLastModifiedString = getCtSkuAttributeValue(existingCtSku, skuAttributeNames.SKU_LAST_MODIFIED_INTERNAL);
  if (!ctSkuLastModifiedString) throw new Error('CT product variant lacks last modified date');
  if (!givenSku.skuLastModifiedInternal) throw new Error('JESTA SKU lacks last modified date');

  const ctSkuLastModifiedDate = new Date(ctSkuLastModifiedString);
  return ctSkuLastModifiedDate.getTime() > givenSku.skuLastModifiedInternal.getTime();
};

const createOrUpdateSku = async (ctHelpers, sku) => {
  const existingCtStyle = await getExistingCtStyle(sku.styleId, ctHelpers);
  if (!existingCtStyle) throw new Error(`Style with id ${sku.styleId} does not exist in CT`);
  const existingCtSku = getCtSkuFromCtStyle(sku.id, existingCtStyle);
  
  if (!existingCtSku) {
    return createSku(sku, existingCtStyle, ctHelpers);
  } if (existingCtSkuIsNewer(existingCtSku, sku)) {
    return null;
  }
  return updateSku(sku, existingCtStyle, ctHelpers);
};

module.exports = {
  createOrUpdateSku: addRetries(createOrUpdateSku, 2, console.error),
  formatSkuRequestBody,
  getActionsFromSku,
  existingCtSkuIsNewer,
  getCtSkuFromCtStyle,
  getCtSkuAttributeValue,
  getCreationAction
};
