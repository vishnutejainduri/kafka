const getCollection = require('../../lib/getCollection');
const messagesLogs = require('../../lib/messagesLogs');
const { filterSkuInventoryMessage, parseSkuInventoryMessage } = require('../../lib/parseSkuInventoryMessage');
const createError = require('../../lib/createError');

const { createLog, addErrorHandling, log } = require('../utils');

global.main = async function (params) {
    log(createLog.params('consumeSkuInventoryMessage', params));
    messagesLogs.storeBatch(params);

    // messages is not used, but paramsExcludingMessages is used
    // eslint-disable-next-line no-unused-vars
    const { messages, ...paramsExcludingMessages } = params;

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
        .filter(addErrorHandling(filterSkuInventoryMessage))
        .map(addErrorHandling(parseSkuInventoryMessage))
        .map(addErrorHandling(async (inventoryData) => {
            const inventoryLastModifiedDate = await inventory.findOne({ _id: inventoryData._id }, { lastModifiedDate: 1 } );
            if (inventoryLastModifiedDate && inventoryData.lastModifiedDate <= inventoryLastModifiedDate.lastModifiedDate) {
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
    .then((results) => {
        const errors = results.filter((res) => res instanceof Error);
        const successes = results.filter((res) => !(res instanceof Error) && res);

        if (errors.length > 0) {
            const e = new Error(`${errors.length} of ${results.length} updates failed. See 'failedUpdatesErrors'.`);
            e.failedUpdatesErrors = errors;
            e.successfulUpdatesResults = successes;

            log('Failed to update some inventory records', "ERROR");
            log(e, "ERROR");
        }

        return {
            ...paramsExcludingMessages,
            messages: successes
        };
    })
    .catch(originalError => {
        throw createError.consumeInventoryMessage.failed(originalError, params);
    });
};

module.exports = global.main;
