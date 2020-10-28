const {
  getExistingCtReturns,
  createOrUpdateReturns,
  addReturnsToOrder,
  mergeCustomObjectDetails
} = require('../orderUtils');
const { returnAttributeNames } = require('../constantsCt')
const { filterReturnDetailsMessages, parseReturnDetailsMessage } = require('../../lib/parseReturnDetailsMessage');
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
const { groupByAttribute } = require('../../lib/utils');

const syncReturnDetailsBatchToCT = (ctHelpers) => async returnDetails => {
  const existingCtReturns = await getExistingCtReturns(returnDetails, ctHelpers);
  const batchedReturnDetailsByReturn = groupByAttribute('returnId')(returnDetails)

  const returnsToCreateOrUpdate = batchedReturnDetailsByReturn.map(returnDetailsByReturn => {
    const emptyReturn = {
       value: {
         returnId: returnDetailsByReturn[0].returnId,
         orderNumber: returnDetailsByReturn[0].orderNumber,
         shipmentId: returnDetailsByReturn[0].shipmentId,
         returnDetails: []
       }
    }
    const existingCtReturn = existingCtReturns.find(existingCtReturn => existingCtReturn.value.returnId === returnDetailsByReturn[0].returnId) || emptyReturn
    const returnDetailsToCreateOrUpdate = mergeCustomObjectDetails(existingCtReturn.value.returnDetails, returnDetailsByReturn, 'returnDetailId', returnAttributeNames.RETURN_DETAILS_LAST_MODIFIED_DATE)
 
    if (!returnDetailsToCreateOrUpdate) {
      return null
    }
    return {
      ...existingCtReturn.value,
      returnDetails: returnDetailsToCreateOrUpdate
    }
  }).filter(Boolean)

  const createdOrUpdatedReturns = await createOrUpdateReturns(returnsToCreateOrUpdate, existingCtReturns, ctHelpers);
  return addReturnsToOrder(createdOrUpdatedReturns, ctHelpers);
};

// Holds two CT helpers, including the CT client. It's declared outside of
// `main` so the same client can be shared between warm starts.
let ctHelpers;

const main = params => {
  log(createLog.params('consumeReturnDetailsMessageCT', params));
  validateParams(params);
  const handleErrors = err => { throw createError.consumeReturnDetailsMessageCT.failed(err, params) };

  if (!ctHelpers) {
    ctHelpers = getCtHelpers(params);
  }
  
  const returnDetailsToCreateOrUpdate = (
    params.messages
      .map(addErrorHandling(msg => filterReturnDetailsMessages(msg) ? msg : null))
      .map(addErrorHandling(parseReturnDetailsMessage))
  );
  const batchedReturnDetailsToCreateOrUpdate = groupByAttribute('orderNumber')(returnDetailsToCreateOrUpdate)

  const batchedReturnDetailsPromises = (
    batchedReturnDetailsToCreateOrUpdate
      .map(addErrorHandling(syncReturnDetailsBatchToCT(ctHelpers)))
  );
  
  return Promise.all(batchedReturnDetailsPromises)
    .then(passDownBatchedErrorsAndFailureIndexes(batchedReturnDetailsToCreateOrUpdate, params.messages))
    .catch(handleErrors);
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
