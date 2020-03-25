const { filterBarcodeMessage, parseBarcodeMessage } = require('../../lib/parseBarcodeMessage');
const { handleBarcode } = require('./utils');
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

  if (!ctHelpers) {
    ctHelpers = getCtHelpers(params);
  }
  
  const barcodesToCreateOrUpdate = (
    params.messages
      .filter(addErrorHandling(filterBarcodeMessage))
      .map(addErrorHandling(parseBarcodeMessage))
  );

  const barcodePromises = (
    barcodesToCreateOrUpdate
      .map(addErrorHandling(handleBarcode.bind(null, ctHelpers)))
  );
  
  return Promise.all(barcodePromises)
    .then(passDownAnyMessageErrors)
    .catch(handleErrors);
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
