const { createOrUpdateStyle } = require('./styleActions');
const { parseStyleMessage, filterStyleMessages } = require('../../lib/parseStyleMessage');
const createError = require('../../lib/createError');
const messagesLogs = require('../../lib/messagesLogs');
const {
  addErrorHandling,
  addLoggingToMain,
  createLog,
  formatLanguageKeys,
  log,
  passDownAnyMessageErrors,
  validateParams
} = require('../utils');

const main = params => {
  log(createLog.params('consumeCatalogMessageCT', params));
  validateParams(params);
  const handleErrors = err => createError.consumeCatalogMessageCT.failed(err, params);
  
  const stylesToCreateOrUpdate = (
    params.messages
      .filter(filterStyleMessages)
      .map(parseStyleMessage)
      .map(formatLanguageKeys)
  );

  return Promise.all(stylesToCreateOrUpdate.map(addErrorHandling(createOrUpdateStyle)))
    .then(passDownAnyMessageErrors)
    .catch(handleErrors);
};

module.exports = addLoggingToMain(main, messagesLogs);
