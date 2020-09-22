const getCollection = require('../../lib/getCollection');
const { filterSkuInventoryMessage, parseSkuInventoryMessage } = require('../../lib/parseSkuInventoryMessage');
const createError = require('../../lib/createError');
const { createLog, addErrorHandling, log, addLoggingToMain, passDownProcessedMessages } = require('../utils');
const { groupByAttribute, getMostUpToDateObject } = require('../../lib/utils');

const groupByInventoryId = groupByAttribute('id');

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

    const inventoryRecords = (params.messages
        .map(addErrorHandling(msg => filterSkuInventoryMessage(msg) ? msg : null))
        .map(addErrorHandling(parseSkuInventoryMessage)))
    const inventoryGroupedByInventoryId = groupByInventoryId(inventoryRecords);

    return Promise.all(inventoryGroupedByInventoryId
        .map(addErrorHandling(async (inventoryGroup) => {
              const inventoryData = getMostUpToDateObject('lastModifiedDate')(inventoryGroup)
              if (!inventoryData) return null;

              const existingInventory = await inventory.findOne({ _id: inventoryData._id }, { lastModifiedDate: 1, quantityInPicking:1 } );
              if (existingInventory && inventoryData.lastModifiedDate < existingInventory.lastModifiedDate) {
                 return null;
              }

              const inventoryUpdateResult = await inventory
                .updateOne({ _id: inventoryData._id }, { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set: inventoryData }, { upsert: true })
                .catch(originalError => {
                    throw createError.consumeInventoryMessage.failedUpdateInventory(originalError, inventoryData);
                })

              if (existingInventory && inventoryUpdateResult.modifiedCount > 0) {
                const quantityInPickingDiff = Math.max(0,  inventoryData.quantityInPicking - existingInventory.quantityInPicking)

                if (quantityInPickingDiff > 0) {
                  const existingSku = await skus.findOne({ _id: inventoryData.skuId }, { quantityReserved:1 } )
                  const newReserveAmount = Math.max(0, existingSku.quantityReserved - quantityInPickingDiff || 0)

                  return skus.updateOne({ _id: inventoryData.skuId }, { $set: { quantityReserved: newReserveAmount } })
                  .catch(originalError => {
                    throw createError.consumeInventoryMessage.failedToRemoveSomeReserves(originalError);
                  })
                }
              }

              return inventoryData;
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
