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
  passDownBatchedErrorsAndFailureIndexes,
  validateParams
} = require('../../product-consumers/utils');
const { groupByAttribute, getMostUpToDateObject } = require('../../lib/utils');

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
      .map(addErrorHandling(msg => filterStyleMessages(msg) ? msg : null))
      .map(addErrorHandling(parseStyleMessageCt))
  );

  const batchedStylesToCreateOrUpdate = groupByAttribute('styleId')(stylesToCreateOrUpdate)
  const stylePromises = (
    batchedStylesToCreateOrUpdate
      .map(addErrorHandling(batchedParsedMessages => {
        const latestParsedMessage = getMostUpToDateObject('lastModifiedDate')(batchedParsedMessages);
        return createOrUpdateStyle(ctHelpers, productTypeId, latestParsedMessage);
      }))
  );

  
  return Promise.all(stylePromises)
    .then(passDownBatchedErrorsAndFailureIndexes(batchedStylesToCreateOrUpdate))
    .catch(handleErrors);
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
