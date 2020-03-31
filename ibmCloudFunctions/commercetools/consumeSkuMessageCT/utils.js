const { getExistingCtStyle } = require('../styleUtils');
const { skuAttributeNames } = require('../constantsCt');
const { addRetries } = require('../../product-consumers/utils');

// Takes array of SKUs. Returns an array that contains each style ID that a SKU
// has, with duplicates removed.
const getUniqueStyleIds = skus => {
  const uniqueStyleIdsSet = skus.reduce((previousStyleIds, currentSku) => (
    previousStyleIds.add(currentSku.styleId)
  ), new Set());

  return Array.from(uniqueStyleIdsSet);
};

// Returns an array of arrays. Each sub-array contains SKUs with matching style
// IDs.
const groupByStyleId = skus => {
  const uniqueStyleIds = getUniqueStyleIds(skus);
  
  return uniqueStyleIds.map(styleId => (
    skus.filter(sku => sku.styleId === styleId)
  ));
};

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
  if (!ctSkuLastModifiedString) throw new Error('CT product variant lacks last modified date');
  if (!givenSku.skuLastModifiedInternal) throw new Error('JESTA SKU lacks last modified date');

  const ctSkuLastModifiedDate = new Date(ctSkuLastModifiedString);
  return ctSkuLastModifiedDate.getTime() > givenSku.skuLastModifiedInternal.getTime();
};

const getStyleNotFoundError = styleId => {
  const err = new Error(`Style with id ${styleId} does not exist in CT`);
  err.code = 404; // so we can let `addRetries` know that it shouldn't retry these failures
  return err;
};

const createOrUpdateSku = async (ctHelpers, sku) => {
  const existingCtStyle = await getExistingCtStyle(sku.styleId, ctHelpers);
  if (!existingCtStyle) throw getStyleNotFoundError(sku.styleId);
  const existingCtSku = getCtSkuFromCtStyle(sku.id, existingCtStyle);
  
  if (!existingCtSku) {
    return createSku(sku, existingCtStyle, ctHelpers);
  } if (existingCtSkuIsNewer(existingCtSku, sku)) {
    return null;
  }
  return updateSku(sku, existingCtSku, existingCtStyle, ctHelpers);
};

const getCtSkusFromCtStyle = (skus, ctStyle) => (
  skus.map(
    sku => getCtSkuFromCtStyle(sku.id, ctStyle)
  ).filter(Boolean)
);

// TODO: add error handling function?
// "Out of date" = the given SKU's last modified date is before the existing CT
// SKU's last modified date
const getOutOfDateSkuIds = (existingCtSkus, skus) => (
  existingCtSkus.filter(ctSku => {
    const correspondingJestaSku = skus.find(sku => sku.id === ctSku.sku);
    if (!correspondingJestaSku) return false;
    return existingCtSkuIsNewer(ctSku, correspondingJestaSku);
  }).map(sku => sku.sku)
);


// TODO: check CT action limit.
// TODO: check whether there are multiple SKUs to add with same id. filter out all but the newest one. (maybe do this check earlier)
// Note: we've already check to make sure each SKU should update
const getActionsFromSkus = (skus, existingCtSkus, ctStyle) => (
  skus.reduce((previousActions, sku) => {
    const matchingCtSku = existingCtSkus.find(ctSku => ctSku.sku == sku.id);
    const attributeUpdateActions = getActionsFromSku(sku, matchingCtSku);

    if (matchingCtSku) return [...previousActions, ...attributeUpdateActions];

    const createSkuAction = getCreationAction(sku, ctStyle); // the SKU doesn't already exist in CT, so we need to create it
    return [...previousActions, createSkuAction, ...attributeUpdateActions];
  }, [])
);

const formatSkuBatchRequestBody = (skusToCreateOrUpdate, ctStyle, existingCtSkus) => {
  const actions = getActionsFromSkus(skusToCreateOrUpdate, existingCtSkus, ctStyle);

  return JSON.stringify({
    version: ctStyle.version,
    actions
  });
};

const createOrUpdateSkus = (skusToCreateOrUpdate, existingCtSkus, ctStyle, { client, requestBuilder }) => {
  const method = 'POST';
  const styleId = skusToCreateOrUpdate[0].styleId;
  const uri = requestBuilder.products.byKey(styleId).build();
  const body = formatSkuBatchRequestBody(skusToCreateOrUpdate, ctStyle, existingCtSkus);

  return client.execute({ method, uri, body });
};

const handleSkuBatch = async (ctHelpers, skus) => {
  if (skus.length === 0) return null;
  const styleId = skus[0].styleId; // all the SKUs in the batch have the same style ID
  const existingCtStyle = await getExistingCtStyle(styleId, ctHelpers);
  if (!existingCtStyle) throw getStyleNotFoundError(styleId);

  const existingCtSkus = getCtSkusFromCtStyle(skus, existingCtStyle);
  const outOfDateSkuIds = getOutOfDateSkuIds(existingCtSkus, skus);
  const skusToCreateOrUpdate = skus.filter(sku => (!outOfDateSkuIds.includes(sku.id)));

  return createOrUpdateSkus(
    skusToCreateOrUpdate,
    existingCtSkus,
    existingCtStyle,
    ctHelpers
  );
};

const RETRY_LIMIT = 2;
const ERRORS_NOT_TO_RETRY = [404];

module.exports = {
  createOrUpdateSku: addRetries(createOrUpdateSku, RETRY_LIMIT, console.error, ERRORS_NOT_TO_RETRY),
  formatSkuRequestBody,
  formatSkuBatchRequestBody,
  getActionsFromSku,
  getActionsFromSkus,
  existingCtSkuIsNewer,
  getCtSkuFromCtStyle,
  getCtSkuAttributeValue,
  getCreationAction,
  getCtSkusFromCtStyle,
  getOutOfDateSkuIds,
  groupByStyleId
};
