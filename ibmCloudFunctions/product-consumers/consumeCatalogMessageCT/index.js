const { createOrUpdateStyle } = require('./styleActions');
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

  if (!ctHelpers) {
    ctHelpers = getCtHelpers(params);
  }
  
  const stylesToCreateOrUpdate = (
    params.messages
      .filter(filterStyleMessages)
      .map(parseStyleMessage)
      .map(formatLanguageKeys)
  );

  const stylePromises = (
    stylesToCreateOrUpdate
      .map(addErrorHandling(createOrUpdateStyle.bind(null, ctHelpers)))
  );
  
  return Promise.all(stylePromises)
    .then(passDownAnyMessageErrors)
    .catch(handleErrors);
};

module.exports = addLoggingToMain(main, messagesLogs);
