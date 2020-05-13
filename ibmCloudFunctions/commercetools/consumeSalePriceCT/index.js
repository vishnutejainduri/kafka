const { prepareSalePriceUpdate, updateStyleSalePrice } = require('./utils');
const {
    filterSalePriceMessages,
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
  passDownAnyMessageErrors,
  validateParams
} = require('../../product-consumers/utils');

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
        .filter(addErrorHandling(filterSalePriceMessages))
        .map(addErrorHandling(parseSalePriceMessage))
  ));

  const updateStyleSalePricesPromises = (
    pricesToUpdate
      .map(addErrorHandling(updateStyleSalePrice.bind(null, ctHelpers, productTypeId)))
  );
  
  return Promise.all(updateStyleSalePricesPromises)
    .then(passDownAnyMessageErrors)
    .catch(handleErrors);
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
