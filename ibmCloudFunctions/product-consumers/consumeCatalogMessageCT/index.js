const { createOrUpdateStyle } = require('./utils');
const { parseStyleMessage, filterStyleMessages } = require('../../lib/parseStyleMessage');
const createError = require('../../lib/createError');
const messagesLogs = require('../../lib/messagesLogs');
const getCtHelpers = require('../../lib/commercetoolsSdk');
const {
  addErrorHandling,
  addLoggingToMain,
  createLog,
  formatLanguageKeys,
  log,
  passDownAnyMessageErrors,
  validateParams
} = require('../utils');

// Holds two CT helpers, including the CT client. It's declared outside of
// `main` so the same client can be shared between warm starts.
let ctHelpers;

const main = params => {
  log(createLog.params('consumeCatalogMessageCT', params));
  validateParams(params);
  const handleErrors = err => createError.consumeCatalogMessageCT.failed(err, params);
  const { productTypeId } = params;

  if (!ctHelpers) {
    ctHelpers = getCtHelpers(params);
  }
  
  const stylesToCreateOrUpdate = (
    params.messages
      .filter(addErrorHandling(filterStyleMessages))
      .filter(addErrorHandling(style => style.webStatus)) // webStatus === `false` indicates that the style shouldn't be available online, we we don't store these styles
      .map(addErrorHandling(parseStyleMessage))
      .map(addErrorHandling(formatLanguageKeys))
  );

  const stylePromises = (
    stylesToCreateOrUpdate
      .map(addErrorHandling(createOrUpdateStyle.bind(null, ctHelpers, productTypeId)))
  );
  
  return Promise.all(stylePromises)
    .then(passDownAnyMessageErrors)
    .catch(handleErrors);
};

module.exports = addLoggingToMain(main, messagesLogs);
