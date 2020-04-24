const { filterSkuMessage } = require('../../lib/parseSkuMessage');
const parseSkuMessageCt = require('../../lib/parseSkuMessageCt');
const createError = require('../../lib/createError');
const messagesLogs = require('../../lib/messagesLogs');
const getCtHelpers = require('../../lib/commercetoolsSdk');
const {
  groupByStyleId,
  getExistingCtStyle,
  createAndPublishStyle,
  getCtSkusFromCtStyle,
  getOutOfDateSkuIds,
  removeDuplicateSkus,
  createOrUpdateSkus
} = require('./utils');
const {
  addErrorHandling,
  addLoggingToMain,
  createLog,
  log,
  passDownAnyMessageErrors,
  validateParams
} = require('../../product-consumers/utils');

// Takes an array of SKUs, all of which have the same style ID. Since they all
// have the same style ID, they can all be updated with a single call to CT.
// This is why we batch them.
const syncSkuBatchToCt = async (ctHelpers, productTypeId, skus) => {
  if (skus.length === 0) return null;
  const styleId = skus[0].styleId;
  let existingCtStyle = await getExistingCtStyle(styleId, ctHelpers);
  if (!existingCtStyle) {
    // create dummy style where none exists
    existingCtStyle = (await createAndPublishStyle ({ id: styleId, name: { 'en-CA': '', 'fr-CA': '' } }, { id: productTypeId }, null, ctHelpers)).body;
  }

  const existingCtSkus = getCtSkusFromCtStyle(skus, existingCtStyle);
  const outOfDateSkuIds = getOutOfDateSkuIds(existingCtSkus, skus);
  const skusToCreateOrUpdate = removeDuplicateSkus(skus.filter(sku => (!outOfDateSkuIds.includes(sku.id))));

  return createOrUpdateSkus(
    skusToCreateOrUpdate,
    existingCtSkus,
    existingCtStyle,
    ctHelpers
  );
};

// Holds two CT helpers, including the CT client. It's declared outside of
// `main` so the same client can be shared between warm starts.
let ctHelpers;

const main = params => {
  log(createLog.params('consumeSkuMessageCT', params));
  validateParams(params);
  const handleErrors = err => { throw createError.consumeSkuMessageCt.failed(err, params) };
  const { productTypeId } = params;

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
      .map(addErrorHandling(syncSkuBatchToCt.bind(null, ctHelpers, productTypeId)))
  );
  
  return Promise.all(skuBatchPromises)
    .then(passDownAnyMessageErrors)
    .catch(handleErrors);
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
