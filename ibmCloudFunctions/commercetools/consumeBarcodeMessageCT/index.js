const { filterBarcodeMessage, parseBarcodeMessage } = require('../../lib/parseBarcodeMessage');
const createError = require('../../lib/createError');
const messagesLogs = require('../../lib/messagesLogs');
const getCtHelpers = require('../../lib/commercetoolsSdk');
const {
  groupBarcodesByStyleId,
  getExistingCtBarcodes,
  getOutOfDateBarcodeIds,
  removeDuplicateBarcodes,
  createOrUpdateBarcodes,
  addBarcodesToSkus
} = require('./utils');
const {
  addErrorHandling,
  addLoggingToMain,
  createLog,
  log,
  passDownBatchedErrorsAndFailureIndexes,
  validateParams
} = require('../../product-consumers/utils');

// Takes an array of barcodes, all of which have the same style ID. Since they
// all have the same style ID, references to them all can be added to the
// corresponding style with a single call to CT. This is why we batch them.
const syncBarcodeBatchToCT = (ctHelpers, productType) => async barcodes => {
  const existingCtBarcodes = await getExistingCtBarcodes(barcodes, ctHelpers);
  const outOfDateBarcodeIds = getOutOfDateBarcodeIds(existingCtBarcodes, barcodes);
  const barcodesToCreateOrUpdate = removeDuplicateBarcodes(barcodes.filter(({ barcode }) => !outOfDateBarcodeIds.includes(barcode))); // we create or update all barcodes that aren't of out of date
  const createdOrUpdatedBarcodes = await createOrUpdateBarcodes(barcodesToCreateOrUpdate, ctHelpers);

  // For some of these barcodes, they should already be added to the relevant
  // SKUs, but it makes the code simpler to add all of them, whether or not
  // they have already been added.
  return addBarcodesToSkus(createdOrUpdatedBarcodes, productType, ctHelpers);
};

// Holds two CT helpers, including the CT client. It's declared outside of
// `main` so the same client can be shared between warm starts.
let ctHelpers;

const main = params => {
  log(createLog.params('consumeBarcodeMessageCT', params));
  validateParams(params);
  const handleErrors = err => { throw createError.consumeBarcodeMessageCT.failed(err, params) };
  const { productTypeId } = params;

  if (!ctHelpers) {
    ctHelpers = getCtHelpers(params);
  }
  
  const barcodesToCreateOrUpdate = (
    params.messages
      .filter(addErrorHandling(filterBarcodeMessage))
      .map(addErrorHandling(parseBarcodeMessage))
  );

  const barcodesGroupedByStyleId = groupBarcodesByStyleId(barcodesToCreateOrUpdate);

  const barcodeBatchPromises = (
    barcodesGroupedByStyleId
      .map(addErrorHandling(syncBarcodeBatchToCT(ctHelpers, productTypeId)))
  );
  
  return Promise.all(barcodeBatchPromises)
    .then(passDownBatchedErrorsAndFailureIndexes(barcodesGroupedByStyleId, params))
    .catch(handleErrors);
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
