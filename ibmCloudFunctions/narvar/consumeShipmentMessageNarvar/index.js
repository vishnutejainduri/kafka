const { filterShipmentMessages, filterMissingTrackingNumberMessages, parseShipmentMessage } = require('../../lib/parseShipmentMessageNarvar');
//const { syncSalesOrderBatchToNarvar } = require('../narvarUtils') 
const createError = require('../../lib/createError');
const messagesLogs = require('../../lib/messagesLogs');
//const { groupByAttribute } = require('../../lib/utils');
const {
  addErrorHandling,
  addLoggingToMain,
  createLog,
  log,
  validateParams,
  passDown
} = require('../../product-consumers/utils');

//const groupByOrderNumber = groupByAttribute(['order_info', 'order_number']);

const main = params => {
  log(createLog.params('consumeShipmentMessageNarvar', params));
  validateParams(params);
  const handleErrors = err => { throw createError.consumeShipmentMessageNarvar.failed(err, params) };

  if (!(params.narvarUserName && params.narvarPassword)) {
    throw new Error('Incomplete narvar credentials')
  }
  const narvarCreds = { username: params.narvarUserName, password: params.narvarPassword, baseUrl: params.narvarUrl }

  const shipmentsToCreateOrUpdate = (
    params.messages
      .map(addErrorHandling(msg => filterShipmentMessages(msg) ? msg : null))
      .map(addErrorHandling(msg => filterMissingTrackingNumberMessages(msg) ? msg : null))
      .map(addErrorHandling(parseShipmentMessage))
  );
  console.log('shipmentsToCreateOrUpdate', shipmentsToCreateOrUpdate)

  /*const salesOrdersGroupedByOrderNumber = groupByOrderNumber(salesOrdersToCreateOrUpdate);

  const salesOrdersPromises = (
    salesOrdersGroupedByOrderNumber
      .map(addErrorHandling(syncSalesOrderBatchToNarvar.bind(null, narvarCreds)))
  );

  return Promise.all(salesOrdersPromises)
    .then(passDown({ batches: salesOrdersGroupedByOrderNumber, messages: params.messages }))
    .catch(handleErrors);*/
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
