const { filterSalesOrderDetailsMessages, parseSalesOrderDetailsMessage } = require('../../lib/parseSalesOrderDetailsMessage');
const createError = require('../../lib/createError');
const messagesLogs = require('../../lib/messagesLogs');
const getCtHelpers = require('../../lib/commercetoolsSdk');
const {
  groupByOrderNumber,
  getExistingCtOrder,
  getCtOrderDetailsFromCtOrder,
  getOutOfDateOrderDetails,
  removeDuplicateOrderDetails,
  updateOrderDetailBatchStatus
} = require('../orderUtils');
const {
  addErrorHandling,
  addLoggingToMain,
  createLog,
  log,
  passDownAnyMessageErrors,
  validateParams
} = require('../../product-consumers/utils');

const syncSalesOrderDetailBatchToCt = async (ctHelpers, salesOrderDetails) => {
  if (salesOrderDetails.length === 0) return null;
  const orderNumber = salesOrderDetails[0].orderNumber;
  let existingCtOrder = await getExistingCtOrder(orderNumber, ctHelpers);
  if (!existingCtOrder) {
    throw 'Order number does not exist';
  }

  const existingCtOrderDetails = getCtOrderDetailsFromCtOrder(salesOrderDetails, existingCtOrder);
  const outOfDateOrderDetails = getOutOfDateOrderDetails(existingCtOrderDetails, salesOrderDetails);
  console.log('outOfDateOrderDetails', outOfDateOrderDetails);
  const orderDetailsToUpdate = removeDuplicateOrderDetails(salesOrderDetails.filter(orderDetail => (!outOfDateOrderDetails.includes(orderDetail.barcode))));
  console.log('orderDetailsToUpdate', orderDetailsToUpdate);

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
      .filter(addErrorHandling(filterSalesOrderDetailsMessages))
      .map(addErrorHandling(parseSalesOrderDetailsMessage))
  );

  const salesOrderDetailsGroupedByOrderNumber = groupByOrderNumber(salesOrderDetailsToUpdate);

  const salesOrderDetailsBatchPromises = (
    salesOrderDetailsGroupedByOrderNumber
      .map(addErrorHandling(syncSalesOrderDetailBatchToCt.bind(null, ctHelpers)))
  );
  
  return Promise.all(salesOrderDetailsBatchPromises)
    .then(passDownAnyMessageErrors)
    .catch(handleErrors);
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
