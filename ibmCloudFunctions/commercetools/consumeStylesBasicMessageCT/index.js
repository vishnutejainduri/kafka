const { updateStyleOutlet } = require('./utils');
const { parseStyleBasicMessageCt } = require('../../lib/parseStyleBasicMessageCt');
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
  log(createLog.params('consumeStylesBasicMessageCT', params));
  validateParams(params);
  const handleErrors = err => { throw createError.consumeStylesBasicMessageCT.failed(err, params) };
  const { productTypeId } = params;

  if (!ctHelpers) {
    ctHelpers = getCtHelpers(params);
  }
  
  const stylesToUpdate = (
    params.messages
      .map(addErrorHandling(parseStyleBasicMessageCt))
  );

  const batchedStylesToUpdate = groupByAttribute('id')(stylesToUpdate)
  const stylePromises = (
    batchedStylesToUpdate
      .map(addErrorHandling(batchedParsedMessages => {
        const latestParsedMessage = getMostUpToDateObject('lastModifiedDate')(batchedParsedMessages);
        return updateStyleOutlet(ctHelpers, productTypeId, latestParsedMessage);
      }))
  );

  return Promise.all(stylePromises)
    .then(passDownBatchedErrorsAndFailureIndexes(batchedStylesToUpdate, params.messages))
    .catch(handleErrors);
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
