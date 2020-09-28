const { getExistingCtShipments, getOutOfDateRecordIds } = require('../orderUtils');
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
  console.log('existingCtShipments', existingCtShipments);
  const outOfDateShipmentIds = getOutOfDateRecordIds(existingCtShipments, shipments, 'key', [shipmentAttributeNames.SHIPMENT_LAST_MODIFIED_DATE]);
  console.log('outOfDateShipmentIds', outOfDateShipmentIds); 
  /*const barcodesToCreateOrUpdate = removeDuplicateBarcodes(barcodes.filter(({ barcode }) => !outOfDateBarcodeIds.includes(barcode))); // we create or update all barcodes that aren't of out of date
  const createdOrUpdatedBarcodes = await createOrUpdateBarcodes(barcodesToCreateOrUpdate, ctHelpers);

  return addBarcodesToSkus(createdOrUpdatedBarcodes, productType, ctHelpers);*/
  return null;
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

  const shipmentsToUpdate = (
    params.messages
      .map(addErrorHandling(msg => filterShipmentMessages(msg) ? msg : null))
      .map(addErrorHandling(parseShipmentMessage))
  );

  const batchedShipmentsToUpdate = groupByAttribute('orderNumber')(shipmentsToUpdate)

  const batchedShipmentsPromises = (
    batchedShipmentsToUpdate
      .map(addErrorHandling(syncShipmentBatchToCT(ctHelpers)))
  );
  
  return Promise.all(batchedShipmentsPromises)
    .then(passDownBatchedErrorsAndFailureIndexes(batchedShipmentsToUpdate, params.messages))
    .catch(handleErrors);
};

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
