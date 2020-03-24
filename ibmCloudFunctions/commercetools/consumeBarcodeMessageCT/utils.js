const getBarcodeFromCt = async (barcode, { client, requestBuilder }) => {
  const method = 'GET';
  const uri = `${requestBuilder.customObjects.build()}/barcodes/${barcode.barcode}`;
  console.log(uri);

  try {
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
    container: 'barcodes', // namespace of the these custom objects in CT
    key: barcode.barcode,
    value: barcode
  });

  const response = await client.execute({ method, uri, body });
  return response.body;
};

const addBarcodeToSku = barcode => {};

const updateBarcode = barcode => {};

const handleBarcode = (ctHelpers, barcode) => {
  const existingBarcode = getBarcodeFromCt(barcode, ctHelpers);

  if (!existingBarcode) {
    const newCtBarcode = createOrUpdateBarcode(barcode);
    const ctBarcodeReference = newCtBarcode.id;
    addBarcodeToSku(barcode);
  } else {
    updateBarcode(barcode);
  }
};

module.exports = {
  handleBarcode,
  createOrUpdateBarcode,
  getBarcodeFromCt
};
