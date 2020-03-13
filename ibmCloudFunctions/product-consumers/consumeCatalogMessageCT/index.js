const { parseStyleMessage, filterStyleMessages } = require('../../lib/parseStyleMessage');
const { createOrUpdateStyle } = require('./styleActions');
const { passDownAnyMessageErrors, handleErrors } = require('./errorHandling');
const messagesLogs = require('../../lib/messagesLogs');
const {
  log,
  createLog,
  validateParams,
  formatLanguageKeys,
  addErrorHandling,
  addLoggingToMain
} = require('../utils');

const main = async params => {
  log(createLog.params('consumeCatalogMessageCT', params));
  validateParams(params);

  const stylesToCreateOrUpdate = (
    params.messages
      .filter(filterStyleMessages)
      .map(parseStyleMessage)
      .map(formatLanguageKeys)
  );

  return Promise.all(stylesToCreateOrUpdate.map(addErrorHandling(createOrUpdateStyle)))
    .then(passDownAnyMessageErrors)
    .catch(handleErrors.bind(null, params));
};

module.exports = addLoggingToMain(main, messagesLogs);
