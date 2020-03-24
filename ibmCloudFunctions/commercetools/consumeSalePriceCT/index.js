const { preparePriceUpdate, updateStylePrice } = require('../priceUtils');
const {
    filterPriceMessages,
    parsePriceMessage,
    ONLINE_SITE_ID
} = require('../../lib/parsePriceMessage');
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
  const handleErrors = err => createError.consumeSalePriceCT.failed(err, params);
  const { productTypeId } = params;

  if (!ctHelpers) {
    ctHelpers = getCtHelpers(params);
  }
 
  
  let pricesToUpdate = (
    await Promise.all(params.messages
        .filter(addErrorHandling(filterPriceMessages))
        .map(addErrorHandling(parsePriceMessage))
        .filter(addErrorHandling(update => update.siteId === ONLINE_SITE_ID))
        .map(addErrorHandling(async(update) => await preparePriceUpdate(ctHelpers, productTypeId, update)))
  ));

  pricesToUpdate = pricesToUpdate.filter(update => update);
  console.log('pricesToUpdate', pricesToUpdate);

  const stylePromises = (
    pricesToUpdate
      .map(addErrorHandling(updateStylePrice.bind(null, ctHelpers, productTypeId)))
  );
  
  return Promise.all(stylePromises)
    .then(passDownAnyMessageErrors)
    .catch(handleErrors);
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
