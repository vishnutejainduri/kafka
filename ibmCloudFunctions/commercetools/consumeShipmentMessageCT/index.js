const {
  getExistingCtShipments,
  getOutOfDateRecordIds,
  removeDuplicateRecords,
  createOrUpdateShipments,
  addShipmentsToOrder
} = require('../orderUtils');
const { shipmentAttributeNames } = require('../constantsCt');
const { filterShipmentMessages, parseShipmentMessage } = require('../../lib/parseShipmentMessage');
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

const syncShipmentBatchToCT = (ctHelpers) => async shipments => {
  const existingCtShipments = await getExistingCtShipments(shipments, ctHelpers);
  const outOfDateShipmentIds = getOutOfDateRecordIds({
    existingCtRecords: existingCtShipments,
    records: shipments,
    key: 'shipmentId',
    ctKey: 'key',
    comparisonFieldPath: ['value', shipmentAttributeNames.SHIPMENT_LAST_MODIFIED_DATE]
  });
  const shipmentsToCreateOrUpdate = removeDuplicateRecords(shipments.filter(shipment => !outOfDateShipmentIds.includes(shipment.shipmentId)), 'shipmentId', shipmentAttributeNames.SHIPMENT_LAST_MODIFIED_DATE);
  const createdOrUpdatedShipments = await createOrUpdateShipments(shipmentsToCreateOrUpdate, existingCtShipments, ctHelpers);

  return addShipmentsToOrder(createdOrUpdatedShipments, ctHelpers);
};

// Holds two CT helpers, including the CT client. It's declared outside of
// `main` so the same client can be shared between warm starts.
let ctHelpers;

const main = params => {
  log(createLog.params('consumeShipmentMessageCT', params));
  validateParams(params);
  const handleErrors = err => { throw createError.consumeShipmentMessageCT.failed(err, params) };

  if (!ctHelpers) {
    ctHelpers = getCtHelpers(params);
  }

  const shipmentsToCreateOrUpdate = (
    params.messages
      .map(addErrorHandling(msg => filterShipmentMessages(msg) ? msg : null))
      .map(addErrorHandling(parseShipmentMessage))
  );

  const batchedShipmentsToCreateOrUpdate = groupByAttribute('orderNumber')(shipmentsToCreateOrUpdate)

  const batchedShipmentsPromises = (
    batchedShipmentsToCreateOrUpdate
      .map(addErrorHandling(syncShipmentBatchToCT(ctHelpers)))
  );
  
  return Promise.all(batchedShipmentsPromises)
    .then(passDownBatchedErrorsAndFailureIndexes(batchedShipmentsToCreateOrUpdate, params.messages))
    .catch(handleErrors);
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
