const { getExistingCtStyle, createStyle } = require('../styleUtils');
const { skuAttributeNames, BARCODE_NAMESPACE, KEY_VALUE_DOCUMENT } = require('../constantsCt');
const { getCtSkuFromCtStyle, getCtSkuAttributeValue, createSku } = require('../consumeSkuMessageCT/utils');
const { addRetries } = require('../../product-consumers/utils');

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

const addBarcodeToSku = async (barcode, productTypeId, ctHelpers) => {
  let style = await getExistingCtStyle(barcode.styleId, ctHelpers);
  if (!style) {
    // create dummy style since none exists
    style = (await createStyle ({ id: barcode.styleId, name: { 'en-CA': '', 'fr-CA': '' } }, { id: productTypeId }, null, ctHelpers)).body;
  }

  let sku = getCtSkuFromCtStyle(barcode.skuId, style);
  if (!sku) {
    // create dummy sku since none exists
    style = (await createSku ({ id: barcode.skuId, styleId: barcode.styleId }, style, ctHelpers)).body;
    sku = getCtSkuFromCtStyle(barcode.skuId, style);
  }

  const action = getBarcodeUpdateAction(barcode, sku);
  const method = 'POST';
  const uri = ctHelpers.requestBuilder.products.byKey(barcode.styleId).build();
  const body = JSON.stringify({
    version: style.version,
    actions: [action] 
  });

  return ctHelpers.client.execute({ method, uri, body });
};

const existingCtBarcodeIsNewer = (existingCtBarcode, givenBarcode) => {
  if (!existingCtBarcode.value.lastModifiedDate) return false;
  if (!givenBarcode.lastModifiedDate) throw new Error(`Given barcode lacks last modified date (barcode number: ${givenBarcode.barcode})`);
  const existingCtBarcodeDate = new Date(existingCtBarcode.value.lastModifiedDate); // the date is stored as a UTC string in CT
  const givenBarcodeDate = new Date(givenBarcode.lastModifiedDate); // the date is stored as a Unix time integer in JESTA

  return existingCtBarcodeDate.getTime() >= givenBarcodeDate.getTime();
};

const handleBarcode = async (ctHelpers, productTypeId, barcode) => {
  const existingBarcode = await getBarcodeFromCt(barcode, ctHelpers);

  if (!existingBarcode) {
    const newCtBarcode = await createOrUpdateBarcode(barcode, ctHelpers);
    return addBarcodeToSku({ ...barcode, ctBarcodeReference: newCtBarcode.id }, productTypeId, ctHelpers);
  } else {
    // If the barcode exists, the SKU should already contain a reference to it,
    // but we call `addBarcodeToSku` here to make extra-sure. There's no danger
    // of adding duplicate barcodes, since those are filtered out by
    // `addBarcodeToSku`.
    await addBarcodeToSku({ ...barcode, ctBarcodeReference: existingBarcode.id }, productTypeId, ctHelpers);

    if (existingCtBarcodeIsNewer(existingBarcode, barcode)) {
      return null;
    }

    return createOrUpdateBarcode(barcode, ctHelpers);
  }
};

const RETRY_LIMIT = 2;
const ERRORS_NOT_TO_RETRY = [404];

module.exports = {
  handleBarcode: addRetries(handleBarcode, RETRY_LIMIT, console.error, ERRORS_NOT_TO_RETRY),
  createOrUpdateBarcode,
  getBarcodeFromCt,
  getBarcodeUpdateAction,
  addBarcodeToSku,
  existingCtBarcodeIsNewer,
  removeDuplicateIds
};
