const { updateStyleSalePrice } = require('./utils');
const {
    validateSalePriceMessages,
    passOnlinePriceMessages,
    passPermanentMarkdownPrices,
    parseSalePriceMessage
} = require('../../lib/parseSalePriceMessage');
const createError = require('../../lib/createError');
const messagesLogs = require('../../lib/messagesLogs');
const getCtHelpers = require('../../lib/commercetoolsSdk');
const {
  addErrorHandling,
  addLoggingToMain,
  createLog,
  log,
  passDownBatchedErrorsAndFailureIndexes,
  validateParams
} = require('../../product-consumers/utils');
const { groupByAttribute, getMostUpToDateObject } = require('../../lib/utils');

// Holds two CT helpers, including the CT client. It's declared outside of
// `main` so the same client can be shared between warm starts.
let ctHelpers;

const main = async params => {
  log(createLog.params('consumeSalePriceCT', params));
  validateParams(params);
  const handleErrors = err => { throw createError.consumeSalePriceCT.failed(err, params) };
  const { productTypeId } = params;

  if (!ctHelpers) {
    ctHelpers = getCtHelpers(params);
  }
  
  let pricesToUpdate = (
    await Promise.all(params.messages
        .map(addErrorHandling(validateSalePriceMessages))
        .map(addErrorHandling(passOnlinePriceMessages))
        .map(addErrorHandling(passPermanentMarkdownPrices))
        .map(addErrorHandling(parseSalePriceMessage))
  ));

  const batchedPricesToUpdate = groupByAttribute('id')(pricesToUpdate)
  const pricePromises = (
    batchedPricesToUpdate
      .map(addErrorHandling(batchedParsedMessages => {
        const latestParsedMessage = getMostUpToDateObject('processDateCreated')(batchedParsedMessages);
        return updateStyleSalePrice(ctHelpers, productTypeId, latestParsedMessage);
      }))
  );

  return Promise.all(pricePromises)
    .then(passDownBatchedErrorsAndFailureIndexes(batchedPricesToUpdate, params.messages))
    .catch(handleErrors);
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
