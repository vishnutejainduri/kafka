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
  passDownProcessedMessages,
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
      // Note that if instead of using map we use filter here, we will end up with mismatched indexes if any message is filtered out
      // The indexes have to be consistent from params.messages to what we pass into batchedStylesToCreateOrUpdate,
      // because it'll be used to extract messages in passDownBatchedErrorsAndFailureIndexes
      .map(addErrorHandling(msg => filterStyleMessages(msg) ? msg : null))
      .map(addErrorHandling(parseStyleMessageCt))
  );

  const batchedStylesToCreateOrUpdate = groupByAttribute('id')(stylesToCreateOrUpdate)
  const stylePromises = (
    batchedStylesToCreateOrUpdate
      .map(addErrorHandling(batchedParsedMessages => {
        const latestParsedMessage = getMostUpToDateObject('lastModifiedDate')(batchedParsedMessages);
        return createOrUpdateStyle(ctHelpers, productTypeId, latestParsedMessage);
      }))
  );

  
  return Promise.all(stylePromises)
    .then(passDownProcessedMessages(params.messages))
    .catch(handleErrors);
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
