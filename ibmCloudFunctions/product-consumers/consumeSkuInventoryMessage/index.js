const getCollection = require('../../lib/getCollection');
const { filterSkuInventoryMessage, parseSkuInventoryMessage } = require('../../lib/parseSkuInventoryMessage');
const createError = require('../../lib/createError');
const { createLog, addErrorHandling, log, addLoggingToMain, passDownProcessedMessages } = require('../utils');

const main = async function (params) {
    log(createLog.params('consumeSkuInventoryMessage', params));

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    let inventory;
    let skus;
    try {
        inventory = await getCollection(params);
        skus = await getCollection(params, params.skusCollectionName);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    return Promise.all(params.messages
        .map(addErrorHandling(msg => filterSkuInventoryMessage(msg) ? msg : null))
        .map(addErrorHandling(parseSkuInventoryMessage))
        .map(addErrorHandling(async (inventoryData) => {
              const inventoryOperations = [];

              const existingInventory = await inventory.findOne({ _id: inventoryData._id }, { lastModifiedDate: 1, quantityInPicking:1 } );
              if (existingInventory && inventoryData.lastModifiedDate < existingInventory.lastModifiedDate) {
                 log("Jesta time: " + inventoryData.lastModifiedDate + "; Mongo time: " + existingInventory.lastModifiedDate);
                 return null;
              } else {
                  inventoryOperations.push(inventory
                    .updateOne({ _id: inventoryData._id }, { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set: inventoryData }, { upsert: true })
                    .then(() => inventoryData)
                    .catch(originalError => {
                        throw createError.consumeInventoryMessage.failedUpdateInventory(originalError, inventoryData);
                    }))
              }

              if (existingInventory) {
                const quantityInPickingDiff = Math.max(0,  inventoryData.quantityInPicking - existingInventory.quantityInPicking)
                if (quantityInPickingDiff > 0) {
                  inventoryOperations.push(skus.updateOne({ _id: inventoryData.skuId }, { $inc: { quantityReserved: (quantityInPickingDiff*-1) } })
                  .catch(originalError => {
                    throw createError.removeQuantityReserved.failedToRemoveSomeReserves(originalError);
                  }))
                }
              }

              return Promise.all(inventoryOperations);
            })
        )
    )
    .then(passDownProcessedMessages(params.messages))
    .catch(originalError => {
        throw createError.consumeInventoryMessage.failed(originalError, params);
    });
};

global.main = addLoggingToMain(main)

module.exports = global.main;
