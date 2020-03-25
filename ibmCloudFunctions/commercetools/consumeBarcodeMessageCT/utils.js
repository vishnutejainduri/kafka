const { getExistingCtStyle } = require('../utils');

/**
 * START FROM SKU PR. DELETE LATER
 */
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
/**
 * END COPIED FROM SKU PR. DELETE LATER
 */

const BARCODE_NAMESPACE = 'barcodes';

const getBarcodeFromCt = async (barcode, { client, requestBuilder }) => {
  const method = 'GET';
  const uri = `${requestBuilder.customObjects.build()}/${BARCODE_NAMESPACE}/${barcode.barcode}`;
  console.log(uri);

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
    container: BARCODE_NAMESPACE, // namespace of the custom barcode objects in CT
    key: barcode.barcode,
    value: barcode
  });

  const response = await client.execute({ method, uri, body });
  return response.body;
};

const getBarcodeUpdateAction = (barcode, sku) => {
  const existingBarcodeReferences = getCtSkuAttributeValue(sku, 'barcodes'); // TODO: use enum
  const newBarcodeReference = { id: barcode.ctBarcodeReference, typeId: 'key-value-document' };
  const allBarcodeReferences = [...existingBarcodeReferences, newBarcodeReference];

  return {
    action: 'setAttribute',
    sku: barcode.skuId,
    name: 'barcodes',
    value: allBarcodeReferences
  };
};

const addBarcodeToSku = async (barcode, { client, requestBuilder }) => {
  const style = await getExistingCtStyle(barcode.styleId, { client, requestBuilder });
  if (!style) throw new Error(`Style ${barcode.styleId} not found in CT`);

  const sku = getCtSkuFromCtStyle(barcode.skuId, style);
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
  const existingCtBarcodeDate = new Date(existingCtBarcode.value.lastModifiedDate); // the date is stored as a string in CT

  return existingCtBarcodeDate.getTime() > givenBarcode.lastModifiedDate.getTime();
};

const handleBarcode = async (ctHelpers, barcode) => {
  const existingBarcode = await getBarcodeFromCt(barcode, ctHelpers);
  console.log('existingBarcode', existingBarcode);

  if (!existingBarcode) {
    const newCtBarcode = await createOrUpdateBarcode(barcode, ctHelpers);
    return addBarcodeToSku({ ...barcode, ctBarcodeReference: newCtBarcode.id }, ctHelpers);
  } else if (existingCtBarcodeIsNewer(existingBarcode, barcode)) {
    return null;
  }
  return createOrUpdateBarcode(barcode, ctHelpers);
};

module.exports = {
  handleBarcode,
  createOrUpdateBarcode,
  getBarcodeFromCt,
  addBarcodeToSku,
  existingCtBarcodeIsNewer
};
