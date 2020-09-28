const { filterSalesOrderDetailsMessages, parseSalesOrderDetailsMessage } = require('../../lib/parseSalesOrderDetailsMessage');
const createError = require('../../lib/createError');
const messagesLogs = require('../../lib/messagesLogs');
const getCtHelpers = require('../../lib/commercetoolsSdk');
const {
  groupByOrderNumber,
  getExistingCtOrder,
  getCtOrderDetailsFromCtOrder,
  getOutOfDateRecordIds,
  removeDuplicateOrderDetails,
  updateOrderDetailBatchStatus
} = require('../orderUtils');
const { orderDetailAttributeNames } = require('../constantsCt');
const {
  addErrorHandling,
  addLoggingToMain,
  createLog,
  log,
  passDownBatchedErrorsAndFailureIndexes,
  validateParams
} = require('../../product-consumers/utils');

const syncSalesOrderDetailBatchToCt = async (ctHelpers, salesOrderDetails) => {
  console.log('salesOrderDetails', salesOrderDetails);
  if (salesOrderDetails.length === 0) return null;
  const orderNumber = salesOrderDetails[0].orderNumber;
  let existingCtOrder = await getExistingCtOrder(orderNumber, ctHelpers);
  if (!existingCtOrder) {
    log.error(`Order number does not exist in CT ${orderNumber}`);
    throw new Error('Order number does not exist');
  }

  const existingCtOrderDetails = getCtOrderDetailsFromCtOrder(salesOrderDetails, existingCtOrder);
  //const outOfDateOrderDetailIds = getOutOfDateOrderDetailIds(existingCtOrderDetails, salesOrderDetails);
  console.log('existingCtOrderDetails', existingCtOrderDetails);
  console.log('salesOrderDetails', salesOrderDetails);
  console.log('orderDetailAttributeNames', orderDetailAttributeNames);
  console.log('getOutOfDateRecordIds', getOutOfDateRecordIds);
  const outOfDateOrderDetailIds = getOutOfDateRecordIds(existingCtOrderDetails, salesOrderDetails, 'id', ['custom', 'fields', orderDetailAttributeNames.ORDER_DETAIL_LAST_MODIFIED_DATE])
  console.log('outOfDateOrderDetailIds', outOfDateOrderDetailIds);
  const orderDetailsToUpdate = removeDuplicateOrderDetails(salesOrderDetails.filter(orderDetail => (!outOfDateOrderDetailIds.includes(orderDetail.id))));

  return updateOrderDetailBatchStatus(
    orderDetailsToUpdate,
    existingCtOrderDetails,
    existingCtOrder,
    ctHelpers
  );
};

// Holds two CT helpers, including the CT client. It's declared outside of
// `main` so the same client can be shared between warm starts.
let ctHelpers;

const main = params => {
  log(createLog.params('consumeSalesOrderDetailsMessageCT', params));
  validateParams(params);
  const handleErrors = err => { throw createError.consumeSalesOrderDetailsMessageCT.failed(err, params) };

  if (!ctHelpers) {
    ctHelpers = getCtHelpers(params);
  }
 
  const salesOrderDetailsToUpdate = (
    params.messages
      .map(addErrorHandling(msg => filterSalesOrderDetailsMessages(msg) ? msg : null))
      .map(addErrorHandling(parseSalesOrderDetailsMessage))
  );
  console.log('salesOrderDetailsToUpdate', salesOrderDetailsToUpdate);
  const salesOrderDetailsGroupedByOrderNumber = groupByOrderNumber(salesOrderDetailsToUpdate);

  const salesOrderDetailsBatchPromises = (
    salesOrderDetailsGroupedByOrderNumber
      .map(addErrorHandling(syncSalesOrderDetailBatchToCt.bind(null, ctHelpers)))
  );
  
  return Promise.all(salesOrderDetailsBatchPromises)
    .then(passDownBatchedErrorsAndFailureIndexes(salesOrderDetailsGroupedByOrderNumber, params.messages))
    .catch(handleErrors);
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
