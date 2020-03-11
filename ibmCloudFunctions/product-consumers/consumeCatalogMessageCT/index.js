const { parseStyleMessage, filterStyleMessages } = require('../../lib/parseStyleMessage');
const { addErrorHandling, log, createLog } = require('../utils');
const {createOrUpdateStyle, handleAPIError} = require('./APIHelpers');

const validateParams = params => {
  if (!params.topicName) {
    throw new Error('Requires an Event Streams topic.');
  }

  if (!params.messages || !params.messages[0] || !params.messages[0].value) {
    throw new Error('Invalid arguments. Must include \'messages\' JSON array with \'value\' field');
  }
};

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
