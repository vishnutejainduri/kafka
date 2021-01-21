//const createError = require('../../lib/createError');
const messagesLogs = require('../../lib/messagesLogs');
const {
  addLoggingToMain,
  createLog,
  log,
  validateParams
} = require('../../product-consumers/utils');

const main = params => {
  log(createLog.params('consumeSalesOrderDetailsMessageNarvar', params));
  validateParams(params);
  //const handleErrors = err => { throw createError.consumeSalesOrderDetailsMessageNarvar.failed(err, params) };
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
