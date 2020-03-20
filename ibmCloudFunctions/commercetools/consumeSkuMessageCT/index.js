const { createOrUpdateSku } = require('../utils');
const { filterSkuMessage, parseSkuMessage } = require('../../lib/parseSkuMessage');
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
  log(createLog.params('consumeSkuMessageCT', params));
  validateParams(params);
  const handleErrors = err => { throw createError.consumeSkuMessageCt.failed(err, params) };

  if (!ctHelpers) {
    ctHelpers = getCtHelpers(params);
  }
  
  const skusToCreateOrUpdate = (
    params.messages
      .filter(addErrorHandling(filterSkuMessage))
      .map(addErrorHandling(parseSkuMessage))
  );

  const skuPromises = (
    skusToCreateOrUpdate
      .map(addErrorHandling(createOrUpdateSku.bind(null, ctHelpers)))
  );
  
  return Promise.all(skuPromises)
    .then(passDownAnyMessageErrors)
    .catch(handleErrors);
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
