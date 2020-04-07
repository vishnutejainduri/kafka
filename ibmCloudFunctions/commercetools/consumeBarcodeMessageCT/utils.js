const { getExistingCtStyle, createAndPublishStyle } = require('../styleUtils');
const { skuAttributeNames, BARCODE_NAMESPACE, KEY_VALUE_DOCUMENT, IS_STAGED } = require('../constantsCt');
const { getCtSkusFromCtStyle, getCtSkuAttributeValue, getCreationAction } = require('../consumeSkuMessageCT/utils');
const { groupByAttribute, getMostUpToDateObject } = require('../../lib/utils');

const groupBarcodesByStyleId = groupByAttribute('styleId');

const getBarcodeFromCt = async (barcode, { client, requestBuilder }) => {
  const method = 'GET';
  const uri = `${requestBuilder.customObjects.build()}/${BARCODE_NAMESPACE}/${barcode.barcode}`;

  try { // the CT client throws an error if it gets a 404 response
    const response = await client.execute({ method, uri }); 
    return response.body;
  } catch (err) {
    if (err.statusCode === 404) return null;
    throw err;
  }
};

const createOrUpdateBarcode = async (barcode, { client, requestBuilder }) => {
  const method = 'POST';
  const uri = requestBuilder.customObjects.build();
  const body = JSON.stringify({
    container: BARCODE_NAMESPACE,
    key: barcode.barcode,
    value: barcode
  });

  const response = await client.execute({ method, uri, body });
  return response.body;
};

const removeDuplicateIds = keyValueDocumentReferences => {
    const ids = keyValueDocumentReferences.map(({ id }) => id);
    const uniqueIds = Array.from(new Set(ids));
    const uniqueKeyValueDocumentReferences = uniqueIds.map(id => ({ id, typeId: KEY_VALUE_DOCUMENT }));
    return uniqueKeyValueDocumentReferences;
};

const existingCtBarcodeIsNewer = (existingCtBarcode, givenBarcode) => {
  if (!existingCtBarcode.value.lastModifiedDate) return false;
  if (!givenBarcode.lastModifiedDate) throw new Error(`Given barcode lacks last modified date (barcode number: ${givenBarcode.barcode})`);
  const existingCtBarcodeDate = new Date(existingCtBarcode.value.lastModifiedDate); // the date is stored as a UTC string in CT
  const givenBarcodeDate = new Date(givenBarcode.lastModifiedDate); // the date is stored as a Unix time integer in JESTA

  return existingCtBarcodeDate.getTime() >= givenBarcodeDate.getTime();
};

const createOrUpdateBarcodes = (barcodes, ctHelpers) => (
  Promise.all(barcodes.map(barcode => createOrUpdateBarcode(barcode, ctHelpers)))
);

const getExistingCtBarcodes = async (barcodes, ctHelpers) => (
  (await Promise.all(barcodes.map(barcode => getBarcodeFromCt(barcode, ctHelpers))))
    .filter(Boolean) // non-existent barcodes are `null`, so we filter them out
);

const getOutOfDateBarcodeIds = (existingCtBarcodes, barcodes) => (
  existingCtBarcodes.filter(ctBarcode => {
    const correspondingJestaBarcode = barcodes.find(({ barcode }) => barcode === ctBarcode.key);
    if (!correspondingJestaBarcode) return false;
    return existingCtBarcodeIsNewer(ctBarcode, correspondingJestaBarcode);
  }).map(barcode => barcode.key)
);

const getSingleSkuBarcodeUpdateAction = (barcodes, sku) => {
  const existingBarcodeReferences = getCtSkuAttributeValue(sku, skuAttributeNames.BARCODES) || [];
  const newBarcodeReferences = barcodes.map(barcode => ({ id: barcode.id, typeId: KEY_VALUE_DOCUMENT }));
  const allBarcodeReferences = removeDuplicateIds([...existingBarcodeReferences, ...newBarcodeReferences]);

  return {
    action: 'setAttribute',
    sku: sku.sku, // the SKU id in commercetools is just called `sku`
    name: 'barcodes',
    value: allBarcodeReferences,
    staged: IS_STAGED
  };
};

const getBarcodeBatchUpdateActions = (barcodes, skus) => (
  skus.map(sku => {
    const matchingBarcodes = barcodes.filter(barcode => barcode.value.skuId === sku.sku);
    if (matchingBarcodes.length === 0) throw new Error(`No barcodes found for SKU ${sku.sku}`); // this shouldn't be possible, but we throw an error here as a sanity check
    return getSingleSkuBarcodeUpdateAction(matchingBarcodes, sku);
  })
);

// Returns an array that contains the SKU ID of any barcode for which a SKU
// does not exist in `existingSkus`
const getMissingSkuIds = (existingSkus, barcodes) => {
  const orphanBarcodes = barcodes.filter(barcode => !existingSkus.some(sku => sku.sku === barcode.value.skuId));
  const missingSkuIds = orphanBarcodes.map(barcode => barcode.value.skuId);

  return [...new Set(missingSkuIds)]; // remove duplicates IDs by adding them to a set
};

// Returns a two element array of the form [newSkus, newStyleVersion], where
// `newSkus` is an array of objects representing the newly created SKUs, and
// `newStyleVersion` is the new version number of the style in CT.
const createDummySkusWithGivenIds = async (style, skuIds, { client, requestBuilder }) => {
  if (skuIds.length === 0) return [[], style.version];
  const createSkuActions = skuIds.map(id => getCreationAction({ id }, style));

  const uri = requestBuilder.products.byKey(style.key).build();
  const method = 'POST';
  const body = JSON.stringify({
    version: style.version,
    actions: createSkuActions
  });

  const result = await client.execute({ method, uri, body });
  const createdSkus = skuIds.map(id => ({ sku: id }));
  return [createdSkus, result.body.version]; // we need to know the new version number to make later calls to CT to update the style
};

const addBarcodesToSkus = async (barcodes, productTypeId, ctHelpers) => {
  if (barcodes.length === 0) return null;
  const { client, requestBuilder } = ctHelpers;
  const styleId = barcodes[0].value.styleId;

  let style = await getExistingCtStyle(styleId, ctHelpers);
  if (!style) {
    // create dummy style since none exists
    style = (await createAndPublishStyle ({ id: styleId, name: { 'en-CA': '', 'fr-CA': '' } }, { id: productTypeId }, null, ctHelpers)).body;

  }

  const uniqueSkuIds = [...new Set(barcodes.map(barcode => barcode.value.skuId))];
  const existingSkus = getCtSkusFromCtStyle(uniqueSkuIds.map(id => ({ id })), style);
  const idsOfSkusToBeCreated = getMissingSkuIds(existingSkus, barcodes);
  const [newSkus, version] = await createDummySkusWithGivenIds(style, idsOfSkusToBeCreated, ctHelpers); // create all SKUs that don't already exist in CT
  const skus = [...existingSkus, ...newSkus];

  const actions = getBarcodeBatchUpdateActions(barcodes, skus);
  const method = 'POST';
  const uri = requestBuilder.products.byKey(styleId).build();
  const body = JSON.stringify({ version, actions });

  return client.execute({ method, uri, body });
};

const groupByBarcode = groupByAttribute('barcode');
const getMostUpToDateBarcode = getMostUpToDateObject('lastModifiedDate');

// There is a small chance that there will be multiple messages in the same
// batch telling us to update or create the same barcode. In these cases, we throw
// out all but the most up to date barcode in the batch.
const removeDuplicateBarcodes = barcodes => {
  const barcodesGroupedById = groupByBarcode(barcodes);

  return barcodesGroupedById.reduce((filteredBarcodes, barcodeBatch) => {
    const mostUpToDateBarcode = getMostUpToDateBarcode(barcodeBatch);
    return [...filteredBarcodes, mostUpToDateBarcode];    
  }, []);
};

module.exports = {
  createOrUpdateBarcode,
  createOrUpdateBarcodes,
  getBarcodeFromCt,
  getSingleSkuBarcodeUpdateAction,
  getBarcodeBatchUpdateActions,
  existingCtBarcodeIsNewer,
  getExistingCtBarcodes,
  removeDuplicateIds,
  groupBarcodesByStyleId,
  getOutOfDateBarcodeIds,
  getMissingSkuIds,
  createDummySkusWithGivenIds,
  removeDuplicateBarcodes,
  addBarcodesToSkus
};
