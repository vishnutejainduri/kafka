const { parseStyleMessage, filterStyleMessages } = require('../../lib/parseStyleMessage');
const { addErrorHandling, log, createLog, validateParams } = require('../utils');
const {createOrUpdateStyle, handleAPIError} = require('./APIHelpers');

const main = async params => {
  log(createLog.params('consumeCatalogMessageCT', params));
  validateParams();
  
  const stylesToAddOrUpdate = params.messages.filter(filterStyleMessages).map(parseStyleMessage);

  for (const style of stylesToAddOrUpdate) {
    try {
      createOrUpdateStyle(style);
    } catch (err) {
      handleAPIError(err);
    }
  }
};

module.exports = main;
