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
  passDownAnyMessageErrors,
  validateParams
} = require('../../product-consumers/utils');

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
      .filter(addErrorHandling(filterSalesOrderMessages))
      .map(addErrorHandling(parseSalesOrderMessage))
  );

  const salesOrderPromises = (
    salesOrdersToUpdate
      .map(addErrorHandling(updateOrderStatus.bind(null, ctHelpers)))
  );

  return Promise.all(salesOrderPromises)
    .then(passDownAnyMessageErrors)
    .catch(handleErrors);
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
