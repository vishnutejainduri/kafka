const { updateOrderStatus } = require('../orderUtils');
const { filterSalesOrderMessages, parseSalesOrderMessage } = require('../../lib/parseSalesOrderMessage');
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
  log(createLog.params('consumeSalesOrderMessageCT', params));
  validateParams(params);
  const handleErrors = err => { throw createError.consumeSalesOrderMessageCT.failed(err, params) };

  if (!ctHelpers) {
    ctHelpers = getCtHelpers(params);
  }

  const salesOrdersToUpdate = (
    params.messages
      .map(addErrorHandling(msg => filterSalesOrderMessages(msg) ? msg : null))
      .map(addErrorHandling(parseSalesOrderMessage))
  );

  const batchedSalesOrdersToUpdate = groupByAttribute('orderNumber')(salesOrdersToUpdate)

  return Promise.all(
    batchedSalesOrdersToUpdate
      .map(addErrorHandling(async batchedParsedMessages => {
        const latestParsedMessage = getMostUpToDateObject('orderLastModifiedDate')(batchedParsedMessages);
        const result = await updateOrderStatus(ctHelpers, latestParsedMessage);
        return result
      }))
    )
    .then(passDownBatchedErrorsAndFailureIndexes(batchedSalesOrdersToUpdate, params.messages))
    .catch(handleErrors);
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
