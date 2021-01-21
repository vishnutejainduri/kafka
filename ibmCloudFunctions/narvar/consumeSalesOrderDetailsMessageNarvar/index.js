const { filterSalesOrderDetailsMessages, parseSalesOrderDetailsMessage } = require('../../lib/parseSalesOrderDetailsMessageNarvar');
//const createError = require('../../lib/createError');
const messagesLogs = require('../../lib/messagesLogs');
const {
  addErrorHandling,
  addLoggingToMain,
  createLog,
  log,
  validateParams
} = require('../../product-consumers/utils');

const main = params => {
  log(createLog.params('consumeSalesOrderDetailsMessageNarvar', params));
  validateParams(params);
  //const handleErrors = err => { throw createError.consumeSalesOrderDetailsMessageNarvar.failed(err, params) };

  if (!(params.narvarUserName && params.narvarPassword)) {
    throw new Error('Incomplete narvar credentials')
  }
  const narvarCreds = { username: params.narvarUserName, password: params.narvarPassword }

  const salesOrderDetailsToUpdate = (
    params.messages
      .map(addErrorHandling(msg => filterSalesOrderDetailsMessages(msg) ? msg : null))
      .map(addErrorHandling(parseSalesOrderDetailsMessage))
  );

  console.log('salesOrderDetailsToUpdate', JSON.stringify(salesOrderDetailsToUpdate))
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
