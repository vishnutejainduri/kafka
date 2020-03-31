const { groupByStyleId, handleSkuBatch } = require('./utils');
const { filterSkuMessage } = require('../../lib/parseSkuMessage');
const parseSkuMessageCt = require('../../lib/parseSkuMessageCt');
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
  log(createLog.params('consumeSkuMessageCT', params));
  validateParams(params);
  const handleErrors = err => { throw createError.consumeSkuMessageCt.failed(err, params) };

  if (!ctHelpers) {
    ctHelpers = getCtHelpers(params);
  }
  
  const skusToCreateOrUpdate = (
    params.messages
      .filter(addErrorHandling(filterSkuMessage))
      .map(addErrorHandling(parseSkuMessageCt))
  );

  // We group SKUs by style ID to avoid concurrency problems when trying to
  // add or update SKUs that belong to the same style at the same time
  const skusGroupedByStyleId = groupByStyleId(skusToCreateOrUpdate);

  const skuBatchPromises = (
    skusGroupedByStyleId
      .map(addErrorHandling(handleSkuBatch.bind(null, ctHelpers)))
  );
  
  return Promise.all(skuBatchPromises)
    .then(passDownAnyMessageErrors)
    .catch(handleErrors);
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
