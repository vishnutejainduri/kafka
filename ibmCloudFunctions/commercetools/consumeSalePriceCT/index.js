const { updateStyleSalePrice } = require('./utils');
const { priceAttributeNames } = require('../constantsCt');
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
  passDown,
  validateParams
} = require('../../product-consumers/utils');
const { groupByAttribute } = require('../../lib/utils');

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
  return Promise.all(
    batchedPricesToUpdate
      .map(addErrorHandling(async batchedParsedMessages => {
        const pricesSortedByDate = batchedParsedMessages.sort((price1, price2) => (
          price1[priceAttributeNames.PROCESS_DATE_CREATED].getTime() - price2[priceAttributeNames.PROCESS_DATE_CREATED].getTime()
        ));
        for (const priceMessage of pricesSortedByDate) {
          await updateStyleSalePrice(ctHelpers, productTypeId, priceMessage);
        }
      }))
  ).then(passDown({ batches: batchedPricesToUpdate, messages: params.messages }))
   .catch(handleErrors);

};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
