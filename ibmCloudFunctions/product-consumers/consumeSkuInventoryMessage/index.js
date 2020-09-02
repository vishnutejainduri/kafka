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
    try {
        inventory = await getCollection(params);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    return Promise.all(params.messages
        .map(addErrorHandling(msg => filterSkuInventoryMessage(msg) ? msg : null))
        .map(addErrorHandling(parseSkuInventoryMessage))
        .map(addErrorHandling(async (inventoryData) => {
            const inventoryLastModifiedDate = await inventory.findOne({ _id: inventoryData._id }, { lastModifiedDate: 1 } );
            if (inventoryLastModifiedDate && inventoryData.lastModifiedDate < inventoryLastModifiedDate.lastModifiedDate) {
               log("Jesta time: " + inventoryData.lastModifiedDate + "; Mongo time: " + inventoryLastModifiedDate.lastModifiedDate);
               return null;
            }

            return inventory
                .updateOne({ _id: inventoryData._id }, { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set: inventoryData }, { upsert: true })
                .then(() => inventoryData)
                .catch(originalError => {
                    throw createError.consumeInventoryMessage.failedUpdateInventory(originalError, inventoryData);
                });
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
