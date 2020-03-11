const { parseStyleMessage, filterStyleMessages } = require('../../lib/parseStyleMessage');
const { log, createLog, validateParams, formatLanguageKeys } = require('../utils');
const { createOrUpdateStyle, handleError } = require('./APIHelpers');

const main = async params => {
  log(createLog.params('consumeCatalogMessageCT', params));
  validateParams();

  const stylesToCreateOrUpdate = (
    params.messages
      .filter(filterStyleMessages)
      .map(parseStyleMessage)
      .map(formatLanguageKeys)
  );

  for (const style of stylesToCreateOrUpdate) {
    try {
      await createOrUpdateStyle(style);
    } catch (err) {
      handleError(err);
    }
  }
};

module.exports = main;
