const { filterBarcodeMessage, parseBarcodeMessage } = require('../../lib/parseBarcodeMessage');
const { groupBarcodesByStyleId, handleBarcodeBatch } = require('./utils');
const createError = require('../../lib/createError');
const messagesLogs = require('../../lib/messagesLogs');
const getCtHelpers = require('../../lib/commercetoolsSdk');
const {
  addErrorHandling,
  addLoggingToMain,
  createLog,
  log,
  passDownAnyMessageErrors,
  validateParams
} = require('../../product-consumers/utils');

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
      .map(addErrorHandling(handleBarcodeBatch(ctHelpers, productTypeId)))
  );
  
  return Promise.all(barcodeBatchPromises)
    .then(passDownAnyMessageErrors)
    .catch(handleErrors);
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
