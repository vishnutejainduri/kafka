const { createOrUpdateStyle } = require('../styleUtils');
const { filterStyleMessages } = require('../../lib/parseStyleMessage');
const { parseStyleMessageCt } = require('../../lib/parseStyleMessageCt');
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
  log(createLog.params('consumeCatalogMessageCT', params));
  validateParams(params);
  const handleErrors = err => { throw createError.consumeCatalogMessageCT.failed(err, params) };
  const { productTypeId } = params;

  if (!ctHelpers) {
    ctHelpers = getCtHelpers(params);
  }
  
  const stylesToCreateOrUpdate = (
    params.messages
      .filter(addErrorHandling(filterStyleMessages))
      .map(addErrorHandling(parseStyleMessageCt))
      .filter(addErrorHandling(style => style.webStatus)) // false `webStatus` indicates that the style shouldn't be available online, we we don't store these styles
  );

  const stylePromises = (
    stylesToCreateOrUpdate
      .map(addErrorHandling(createOrUpdateStyle.bind(null, ctHelpers, productTypeId)))
  );
  
  return Promise.all(stylePromises)
    .then(passDownAnyMessageErrors)
    .catch(handleErrors);
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
