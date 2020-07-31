const { updateStyleFacets } = require('./utils');
const { parseFacetMessageCt, filterFacetMessageCt } = require('../../lib/parseFacetMessageCt');
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

const main = params => {
  log(createLog.params('consumeFacetMessageCT', params));
  validateParams(params);
  const handleErrors = err => { throw createError.consumeFacetMessageCT.failed(err, params) };
  const { productTypeId } = params;

  if (!ctHelpers) {
    ctHelpers = getCtHelpers(params);
  }
  
  const stylesToUpdate = (
    params.messages
      .map(addErrorHandling(msg => filterFacetMessageCt(msg) ? msg : null))
      .map(addErrorHandling(parseFacetMessageCt))
  );

  const stylePromises = (
    stylesToUpdate
      .map(addErrorHandling(updateStyleFacets.bind(null, ctHelpers, productTypeId)))
  );
  
  return Promise.all(stylePromises)
    .then(passDownAnyMessageErrors)
    .catch(handleErrors);
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
