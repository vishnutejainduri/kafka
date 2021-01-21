const { filterSalesOrderDetailsMessages, parseSalesOrderDetailsMessage } = require('../../lib/parseSalesOrderDetailsMessageNarvar');
//const createError = require('../../lib/createError');
const messagesLogs = require('../../lib/messagesLogs');
const { groupByAttribute } = require('../../lib/utils');
const {
  addErrorHandling,
  addLoggingToMain,
  createLog,
  log,
  validateParams
} = require('../../product-consumers/utils');

const groupByOrderNumber = groupByAttribute(['order_info', 'order_number']);

const main = params => {
  log(createLog.params('consumeSalesOrderDetailsMessageNarvar', params));
  validateParams(params);
  const handleErrors = err => { throw createError.consumeSalesOrderDetailsMessageNarvar.failed(err, params) };

  if (!(params.narvarUserName && params.narvarPassword)) {
    throw new Error('Incomplete narvar credentials')
  }
  const narvarCreds = { username: params.narvarUserName, password: params.narvarPassword }

  const salesOrderDetailsToCreateOrUpdate = (
    params.messages
      .map(addErrorHandling(msg => filterSalesOrderDetailsMessages(msg) ? msg : null))
      .map(addErrorHandling(parseSalesOrderDetailsMessage))
  );

  console.log('salesOrderDetailsToCreateOrUpdate', JSON.stringify(salesOrderDetailsToCreateOrUpdate))

  const salesOrderDetailsGroupedByOrderNumber = groupByOrderNumber(salesOrderDetailsToCreateOrUpdate);

  console.log('salesOrderDetailsGroupedByOrderNumber', salesOrderDetailsGroupedByOrderNumber)

  /*const salesOrderDetailsPromises = (
    salesOrderDetailsGroupedByOrderNumber
      .map(addErrorHandling(syncSalesOrderDetailBatchToCt.bind(null, ctHelpers)))
  );
  
  return Promise.all(salesOrderDetailsPromises)
    .then(passDown({ batches: salesOrderDetailsGroupedByOrderNumber, messages: params.messages }))
    .catch(handleErrors);*/
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
