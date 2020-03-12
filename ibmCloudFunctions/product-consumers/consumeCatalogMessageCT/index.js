const { parseStyleMessage, filterStyleMessages } = require('../../lib/parseStyleMessage');
const { log, createLog, validateParams, formatLanguageKeys, addErrorHandling } = require('../utils');
const { createOrUpdateStyle } = require('./APIHelpers');
const { passDownAnyMessageErrors, handleErrors } = require('./errorHandling');

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
    .catch(handleErrors);
};

module.exports = main;
