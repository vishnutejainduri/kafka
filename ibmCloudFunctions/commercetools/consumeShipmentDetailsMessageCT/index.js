const {
  getExistingCtShipments,
  createOrUpdateShipments,
  addShipmentsToOrder,
  mergeShipmentDetails
} = require('../orderUtils');
const { shipmentAttributeNames } = require('../constantsCt');
const { filterShipmentDetailsMessages, parseShipmentDetailsMessage } = require('../../lib/parseShipmentDetailsMessage');
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

const syncShipmentDetailsBatchToCT = (ctHelpers) => async shipmentDetails => {
  const existingCtShipments = await getExistingCtShipments(shipmentDetails, ctHelpers);
  console.log('existingCtShipments', existingCtShipments)
  const batchedShipmentDetailsByShipment = groupByAttribute('shipmentId')(shipmentDetails)

  const shipmentsToCreateOrUpdate = batchedShipmentDetailsByShipment.map(shipmentDetailsByShipment => {
    const emptyShipment = {
       value: {
         shipmentId: shipmentDetailsByShipment[0].shipmentId,
         orderNumber: shipmentDetailsByShipment[0].orderNumber,
         shipmentDetails: []
       }
    }
    const existingCtShipment = existingCtShipments.find(existingCtShipment => existingCtShipment.value.shipmentId === shipmentDetailsByShipment[0].shipmentId) || emptyShipment
    console.log('existingCtShipment CHOSEN', existingCtShipment)
    const shipmentDetailsToCreateOrUpdate = mergeShipmentDetails(existingCtShipment.value.shipmentDetails, shipmentDetailsByShipment)
  
    if (!shipmentDetailsToCreateOrUpdate) {
      return null
    }
    return {
      ...existingCtShipment.value,
      shipmentDetails: shipmentDetailsToCreateOrUpdate
    }
  }).filter(Boolean)
  console.log('shipmentsToCreateOrUpdate', JSON.stringify(shipmentsToCreateOrUpdate));

  const createdOrUpdatedShipments = await createOrUpdateShipments(shipmentsToCreateOrUpdate, existingCtShipments, ctHelpers);
  return addShipmentsToOrder(createdOrUpdatedShipments, ctHelpers);
};

// Holds two CT helpers, including the CT client. It's declared outside of
// `main` so the same client can be shared between warm starts.
let ctHelpers;

const main = params => {
  log(createLog.params('consumeShipmentDetailsMessageCT', params));
  validateParams(params);
  const handleErrors = err => { throw createError.consumeShipmentDetailsMessageCT.failed(err, params) };

  if (!ctHelpers) {
    ctHelpers = getCtHelpers(params);
  }

  const shipmentDetailsToCreateOrUpdate = (
    params.messages
      .map(addErrorHandling(msg => filterShipmentDetailsMessages(msg) ? msg : null))
      .map(addErrorHandling(parseShipmentDetailsMessage))
  );
  console.log('shipmentDetailsToCreateOrUpdate', shipmentDetailsToCreateOrUpdate)

  const batchedShipmentDetailsToCreateOrUpdate = groupByAttribute('orderNumber')(shipmentDetailsToCreateOrUpdate)

  const batchedShipmentDetailsPromises = (
    batchedShipmentDetailsToCreateOrUpdate
      .map(addErrorHandling(syncShipmentDetailsBatchToCT(ctHelpers)))
  );
  
  return Promise.all(batchedShipmentDetailsPromises)
    .then(passDownBatchedErrorsAndFailureIndexes(batchedShipmentDetailsToCreateOrUpdate, params.messages))
    .catch(handleErrors);
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
