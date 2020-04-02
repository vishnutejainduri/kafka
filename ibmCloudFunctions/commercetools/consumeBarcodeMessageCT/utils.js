const { getExistingCtStyle } = require('../styleUtils');
const { skuAttributeNames, BARCODE_NAMESPACE, KEY_VALUE_DOCUMENT } = require('../constantsCt');
const { getCtSkuFromCtStyle, getCtSkusFromCtStyle, getCtSkuAttributeValue } = require('../consumeSkuMessageCT/utils');
const { addRetries } = require('../../product-consumers/utils');

const getUniqueAttributeValues = attributeName => items => {
  const uniqueAttributeValues = items.reduce((previousUniqueValues, item) => (
    previousUniqueValues.add(item[attributeName])
  ), new Set());

  return Array.from(uniqueAttributeValues);
};

const groupByAttribute = attributeName => items => {
  const uniqueAttributeValues = getUniqueAttributeValues(attributeName)(items);

  return uniqueAttributeValues.map(value => (
    items.filter(item => item[attributeName] === value)
  ));
};

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

const getBarcodeUpdateAction = (barcode, sku) => {
  const existingBarcodeReferences = getCtSkuAttributeValue(sku, skuAttributeNames.BARCODES) || [];
  const newBarcodeReference = { id: barcode.ctBarcodeReference, typeId: KEY_VALUE_DOCUMENT };
  const allBarcodeReferences = removeDuplicateIds([...existingBarcodeReferences, newBarcodeReference]);

  return {
    action: 'setAttribute',
    sku: barcode.skuId,
    name: 'barcodes',
    value: allBarcodeReferences
  };
};

const getNotFoundError = message => {
  const err = new Error(message);
  err.code = 404;
  return err;
};

const addBarcodeToSku = async (barcode, { client, requestBuilder }) => {
  const style = await getExistingCtStyle(barcode.styleId, { client, requestBuilder });
  if (!style) throw getNotFoundError(`Style ${barcode.styleId} not found in CT`);

  const sku = getCtSkuFromCtStyle(barcode.skuId, style);
  if (!sku) throw getNotFoundError(`SKU ${barcode.skuId} not found in CT`);

  const action = getBarcodeUpdateAction(barcode, sku);
  const method = 'POST';
  const uri = requestBuilder.products.byKey(barcode.styleId).build();
  const body = JSON.stringify({
    version: style.version,
    actions: [action] 
  });

  return client.execute({ method, uri, body });
};

const existingCtBarcodeIsNewer = (existingCtBarcode, givenBarcode) => {
  if (!existingCtBarcode.value.lastModifiedDate) throw new Error(`CT barcode lacks last modified date (object reference: ${existingCtBarcode.id})`);
  if (!givenBarcode.lastModifiedDate) throw new Error(`Given barcode lacks last modified date (barcode number: ${givenBarcode.barcode})`);
  const existingCtBarcodeDate = new Date(existingCtBarcode.value.lastModifiedDate); // the date is stored as a UTC string in CT
  const givenBarcodeDate = new Date(givenBarcode.lastModifiedDate); // the date is stored as a Unix time integer in JESTA

  return existingCtBarcodeDate.getTime() >= givenBarcodeDate.getTime();
};

const handleBarcode = async (ctHelpers, barcode) => {
  const existingBarcode = await getBarcodeFromCt(barcode, ctHelpers);

  if (!existingBarcode) {
    const newCtBarcode = await createOrUpdateBarcode(barcode, ctHelpers);
    return addBarcodeToSku({ ...barcode, ctBarcodeReference: newCtBarcode.id }, ctHelpers);
  } else {
    // If the barcode exists, the SKU should already contain a reference to it,
    // but we call `addBarcodeToSku` here to make extra-sure. There's no danger
    // of adding duplicate barcodes, since those are filtered out by
    // `addBarcodeToSku`.
    await addBarcodeToSku({ ...barcode, ctBarcodeReference: existingBarcode.id }, ctHelpers);

    if (existingCtBarcodeIsNewer(existingBarcode, barcode)) {
      return null;
    }

    return createOrUpdateBarcode(barcode, ctHelpers);
  }
};

const createOrUpdateBarcodes = (barcodes, ctHelpers) => (
  Promise.all(barcodes.map(barcode => createOrUpdateBarcode(barcode, ctHelpers)))
);

const getExistingCtBarcodes = (barcodes, ctHelpers) => (
  Promise.all(barcodes.map(barcode => getBarcodeFromCt(barcode, ctHelpers)))
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
    value: allBarcodeReferences
  };
};

const getBarcodeBatchUpdateActions = (barcodes, skus) => (
  skus.map(sku => {
    const matchingBarcodes = barcodes.filter(barcode => barcode.value.skuId === sku.sku);
    if (matchingBarcodes.length === 0) throw new Error(`No barcodes found for SKU ${sku.sku}`); // this shouldn't be possible, but we throw an error here as a sanity check
    return getSingleSkuBarcodeUpdateAction(matchingBarcodes, sku);
  })
);

const addBarcodesToSkus = async (barcodes, { client, requestBuilder }) => {
  if (barcodes.length === 0) return null;
  const styleId = barcodes[0].value.styleId;
  const style = await getExistingCtStyle(styleId, { client, requestBuilder });
  if (!style) throw getNotFoundError(`Style ${styleId} not found in CT`); // TODO: create missing style if necessary

  const uniqueSkuIds = [...new Set(barcodes.map(barcode => barcode.value.skuId))];
  const skus = getCtSkusFromCtStyle(uniqueSkuIds.map(id => ({ id })), style); // TODO: create missing SKUs if necessary
  const actions = getBarcodeBatchUpdateActions(barcodes, skus);
  const method = 'POST';
  const uri = requestBuilder.products.byKey(styleId).build();
  const body = JSON.stringify({ version: style.version, actions });

  return client.execute({ method, uri, body });
};

// Note: all given barcodes must have same the style ID
const handleBarcodeBatch = async (ctHelpers, barcodes) => {
  const existingCtBarcodes = (await getExistingCtBarcodes(barcodes, ctHelpers)).filter(Boolean); // non-existent barcodes are `null`, so we filter them out
  const outOfDateBarcodeNumbers = getOutOfDateBarcodeIds(existingCtBarcodes, barcodes);
  const barcodesToCreateOrUpdate = barcodes.filter(({ barcode }) => !outOfDateBarcodeNumbers.includes(barcode)); // we create or update all barcodes that aren't of out of date
  const createdOrUpdatedBarcodes = await createOrUpdateBarcodes(barcodesToCreateOrUpdate, ctHelpers);

  // For some of these barcodes, they should already be added to the relevant
  // SKUs, but it makes the code simpler to add all of them, whether or not
  // they have already been added.
  return addBarcodesToSkus(createdOrUpdatedBarcodes, ctHelpers);
};

const RETRY_LIMIT = 2;
const ERRORS_NOT_TO_RETRY = [404];

module.exports = {
  handleBarcode: addRetries(handleBarcode, RETRY_LIMIT, console.error, ERRORS_NOT_TO_RETRY),
  handleBarcodeBatch,
  createOrUpdateBarcode,
  getBarcodeFromCt,
  getBarcodeUpdateAction, // deprecated
  getSingleSkuBarcodeUpdateAction,
  getBarcodeBatchUpdateActions,
  addBarcodeToSku,
  existingCtBarcodeIsNewer,
  removeDuplicateIds,
  groupBarcodesByStyleId,
  getOutOfDateBarcodeIds
};
