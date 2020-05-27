const { getExistingCtStyle, createAndPublishStyle } = require('../styleUtils');
const { skuAttributeNames, isStaged, entityStatus, CT_ACTION_LIMIT } = require('../constantsCt');
const { groupByAttribute } = require('../../lib/utils');

const groupByStyleId = groupByAttribute('styleId');

const getCtSkuAttributeValue = (ctSku, attributeName) => {
  if (!ctSku.attributes) return undefined;
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
    value: sku[attribute],
    staged: isStaged
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
    style.masterData[entityStatus].masterVariant.attributes
  );

  return {
    action: 'addVariant',
    sku: sku.id,
    attributes,
    staged: isStaged
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

// Returns the matching staged SKU if one exists. Otherwise returns the
// matching current SKU if one exists, or `undefined` if no matching
// current SKU exists.
// Note: This ignores the master variant, which is a placeholder that doesn't
// correspond to an actual SKU
const getCtSkuFromCtStyle = (skuId, ctStyle) => {
  // The status of the SKU that we find (staged vs. current) should match the
  // status of the SKU that we will add if the given SKU can't be found. When
  // adding a missing SKU, we also set it as staged or current according to the
  // value of `isStaged`.
  const skuStatus = isStaged ? 'staged' : 'current';
  const skus = ctStyle.masterData[skuStatus] && ctStyle.masterData[skuStatus].variants;
  return skus && skus.find(variant => variant.sku === skuId); // in CT, the SKU ID is simply called 'sku'
};

const existingCtSkuIsNewer = (existingCtSku, givenSku) => {
  const ctSkuLastModifiedString = getCtSkuAttributeValue(existingCtSku, skuAttributeNames.SKU_LAST_MODIFIED_INTERNAL);
  if (!ctSkuLastModifiedString) return false;
  if (!givenSku[skuAttributeNames.SKU_LAST_MODIFIED_INTERNAL]) throw new Error('JESTA SKU lacks last modified date');

  const ctSkuLastModifiedDate = new Date(ctSkuLastModifiedString);
  return ctSkuLastModifiedDate.getTime() >= givenSku[skuAttributeNames.SKU_LAST_MODIFIED_INTERNAL].getTime();
};

const getCtSkusFromCtStyle = (skus, ctStyle) => (
  skus.map(
    sku => getCtSkuFromCtStyle(sku.id, ctStyle)
  ).filter(Boolean)
);

const getOutOfDateSkuIds = (existingCtSkus, skus) => (
  existingCtSkus.filter(ctSku => {
    const correspondingJestaSku = skus.find(sku => sku.id === ctSku.sku);
    if (!correspondingJestaSku) return false;
    return existingCtSkuIsNewer(ctSku, correspondingJestaSku);
  }).map(sku => sku.sku)
);


// Note: When calling this function, you should already have made sure that
// each SKU you give it should be updated (e.g., that it's not out of date).
// This function doesn't make those checks.
const getActionsFromSkus = (skus, existingCtSkus, ctStyle) => (
  skus.reduce((previousActions, sku) => {
    const matchingCtSku = existingCtSkus.find(ctSku => ctSku.sku == sku.id);
    const attributeUpdateActions = getActionsFromSku(sku, matchingCtSku);

    if (matchingCtSku) return [...previousActions, ...attributeUpdateActions];

    const createSkuAction = getCreationAction(sku, ctStyle); // the SKU doesn't already exist in CT, so we need to create it
    return [...previousActions, createSkuAction, ...attributeUpdateActions];
  }, [])
);

const groupByN = n => items => {
  const groupedItems = [];
  for (let i = 0; i < items.length; i += n) {
    groupedItems.push(items.slice(i, i + n));
  }
  return groupedItems;
};

const createOrUpdateSkus = async (skusToCreateOrUpdate, existingCtSkus, ctStyle, { client, requestBuilder }) => {
  if (skusToCreateOrUpdate.length === 0) return null;

  const method = 'POST';
  const styleId = skusToCreateOrUpdate[0].styleId;
  const uri = requestBuilder.products.byKey(styleId).build();

  const actionsGroupedByActionLimit = groupByN(CT_ACTION_LIMIT)(getActionsFromSkus(skusToCreateOrUpdate, existingCtSkus, ctStyle));

  let workingStyle = ctStyle;
  for (const actions of actionsGroupedByActionLimit) {
    const body = JSON.stringify({ version: workingStyle.version, actions });
    workingStyle = (await client.execute({ method, uri, body })).body
  }

  return workingStyle;
};

const groupBySkuId = groupByAttribute('id');

// Helper for `removeDuplicateSkus`
const getMostUpToDateSku = skus => {
  const skusSortedByDate = skus.sort((sku1, sku2) => (
    sku2[skuAttributeNames.SKU_LAST_MODIFIED_INTERNAL] - sku1[skuAttributeNames.SKU_LAST_MODIFIED_INTERNAL]
  ));

  return skusSortedByDate[0];
};

// There is a small chance that there will be multiple messages in the same
// batch telling us to update or create the same SKU. In these cases, we throw
// out all but the most up to date SKU in the batch.
const removeDuplicateSkus = skus => {
  const skusGroupedById = groupBySkuId(skus);

  return skusGroupedById.reduce((filteredSkus, skuBatch) => {
    const mostUpToDateSku = getMostUpToDateSku(skuBatch);
    return [...filteredSkus, mostUpToDateSku];    
  }, []);
};

module.exports = {
  formatSkuRequestBody,
  getActionsFromSku,
  getActionsFromSkus,
  existingCtSkuIsNewer,
  getCtSkuFromCtStyle,
  getCtSkuAttributeValue,
  getCreationAction,
  getCtSkusFromCtStyle,
  getOutOfDateSkuIds,
  getMostUpToDateSku,
  getExistingCtStyle,
  groupByStyleId,
  groupByN,
  removeDuplicateSkus,
  createAndPublishStyle,
  createOrUpdateSkus
};
