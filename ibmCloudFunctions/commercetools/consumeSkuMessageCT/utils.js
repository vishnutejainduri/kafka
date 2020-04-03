const { getExistingCtStyle, createStyle } = require('../styleUtils');
const { skuAttributeNames } = require('../constantsCt');
const { addRetries } = require('../../product-consumers/utils');

const getCtSkuAttributeValue = (ctSku, attributeName) => {
  const foundAttribute = ctSku.attributes.find(attribute => attribute.name === attributeName);
  if (!foundAttribute) return undefined;
  return foundAttribute.value;
};

const isSkuAttributeThatShouldUpdate = attribute => {
  const skuAttributesThatShouldUpdate = Object.values(skuAttributeNames);
  return skuAttributesThatShouldUpdate.includes(attribute);
};

// This is to help filter CT SKU update actions. Basically, CT will throw an
// error if you try to set a non-existing attribute to `null`, but it allows
// you to set an *existing* attribute to `null`. In these cases, it will remove
// the attribute from the SKU. We don't want to simply filter out `null` values
// because then we won't clear existing values that should be cleared.
const isExistingAttributeOrNonNullish = (ctSku, action) => {
  if (action.value !== null && action.value !== undefined) return true;
  if (getCtSkuAttributeValue(ctSku, action.name) !== undefined) return true;
  return false;
};

// Like `isExistingAttributeOrNonNullish`, this is used to filter CT SKU update
// actions. Used for the case when the SKU doesn't already exist in CT. Since
// the SKU doesn't already exist, it has no pre-existing attributes, so CT will throw
// an error if you tacitly tell it to remove any of these non-exist attributes
// by setting a value to `null`.
const hasNonNullishValue = action => (action.value !== null && action.value !== undefined);

// Returns an array of CT actions, each of which tells CT to set a different
// attribute of the given SKU
const getActionsFromSku = (sku, existingSku = null) => {
  const attributes = Object.keys(sku).filter(isSkuAttributeThatShouldUpdate);

  const actions = attributes.map(attribute => ({
    action: 'setAttribute',
    sku: sku.id,
    name: attribute,
    value: sku[attribute]
  }));

  if (existingSku) return actions.filter(isExistingAttributeOrNonNullish.bind(null, existingSku));
  return actions.filter(hasNonNullishValue);
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

const formatSkuRequestBody = (sku, style, existingSku = null) => {
  const actionsThatSetSkuAttributes = getActionsFromSku(sku, existingSku);
  const creationAction = getCreationAction(sku, style);
  const actionsIncludingCreateActions = [creationAction, ...actionsThatSetSkuAttributes];

  return JSON.stringify({
    version: style.version,
    actions: existingSku ? actionsThatSetSkuAttributes : actionsIncludingCreateActions
  });
};

const createSku = (sku, style, { client, requestBuilder }) => {
  const method = 'POST';
  const uri = requestBuilder.products.byKey(sku.styleId).build();
  const body = formatSkuRequestBody(sku, style, null);

  return client.execute({ method, uri, body });
};

const updateSku = (sku, existingCtSku, style, { client, requestBuilder }) => {
  const method = 'POST';
  const uri = requestBuilder.products.byKey(sku.styleId).build();
  const body = formatSkuRequestBody(sku, style, existingCtSku);

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

const existingCtSkuIsNewer = (existingCtSku, givenSku) => {
  const ctSkuLastModifiedString = getCtSkuAttributeValue(existingCtSku, skuAttributeNames.SKU_LAST_MODIFIED_INTERNAL);
  if (!ctSkuLastModifiedString) return false;
  if (!givenSku.skuLastModifiedInternal) throw new Error('JESTA SKU lacks last modified date');

  const ctSkuLastModifiedDate = new Date(ctSkuLastModifiedString);
  return ctSkuLastModifiedDate.getTime() >= givenSku.skuLastModifiedInternal.getTime();
};

const createOrUpdateSku = async (ctHelpers, productTypeId, sku) => {
  let existingCtStyle = await getExistingCtStyle(sku.styleId, ctHelpers);
  if (!existingCtStyle) {
    // create dummy style where none exists
    existingCtStyle = (await createStyle ({ id: sku.styleId, name: { 'en-CA': '', 'fr-CA': '' } }, { id: productTypeId }, null, ctHelpers)).body;
  }
  const existingCtSku = getCtSkuFromCtStyle(sku.id, existingCtStyle);
  
  if (!existingCtSku) {
    return createSku(sku, existingCtStyle, ctHelpers);
  } if (existingCtSkuIsNewer(existingCtSku, sku)) {
    return null;
  }
  return updateSku(sku, existingCtSku, existingCtStyle, ctHelpers);
};

const RETRY_LIMIT = 2;
const ERRORS_NOT_TO_RETRY = [404];

module.exports = {
  createOrUpdateSku: addRetries(createOrUpdateSku, RETRY_LIMIT, console.error, ERRORS_NOT_TO_RETRY),
  formatSkuRequestBody,
  getActionsFromSku,
  existingCtSkuIsNewer,
  getCtSkuFromCtStyle,
  getCtSkuAttributeValue,
  getCreationAction,
  createSku
};
