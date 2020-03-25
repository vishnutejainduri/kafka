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

  try {
    const response = await client.execute({ method, uri }); // the CT client throws an error if it gets a 404 response
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
    container: BARCODE_NAMESPACE, // namespace of the these custom objects in CT
    key: barcode.barcode,
    value: barcode
  });

  const response = await client.execute({ method, uri, body });
  return response.body;
};

// setSkuAttribute = ({ style, skuId, attributeName, attributeValue, ctHelpers}) => {
//   const { };
  

// };

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

const handleBarcode = (ctHelpers, barcode) => {
  const existingBarcode = getBarcodeFromCt(barcode, ctHelpers);

  if (!existingBarcode) {
    const newCtBarcode = createOrUpdateBarcode(barcode, ctHelpers);
    addBarcodeToSku({ ...barcode, ctBarcodeReference: newCtBarcode.id }, ctHelpers);
  } else {
    // TODO: check if exsiting barcode is newer.
    createOrUpdateBarcode(barcode, ctHelpers);
  }
};

// TODO: in parse message, change `lastModifiedDate` to something more descriptive. add id (which will = barcode)?


module.exports = {
  handleBarcode,
  createOrUpdateBarcode,
  getBarcodeFromCt,
  addBarcodeToSku
};
