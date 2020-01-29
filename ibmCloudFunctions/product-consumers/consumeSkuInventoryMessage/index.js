const getCollection = require('../../lib/getCollection');
const messagesLogs = require('../../lib/messagesLogs');
const { filterSkuInventoryMessage, parseSkuInventoryMessage } = require('../../lib/parseSkuInventoryMessage');
const createError = require('../../lib/createError');

const { handleStyleUpdate } = require('./utils');
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
    let styles;
    let skus;
    try {
        inventory = await getCollection(params);
        styles = await getCollection(params, params.stylesCollectionName);
        skus = await getCollection(params, params.skusCollectionName);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    return Promise.all(params.messages
        .filter(addErrorHandling(filterSkuInventoryMessage))
        .map(addErrorHandling(parseSkuInventoryMessage))
        .map(addErrorHandling(async (inventoryData) => {
            const inventoryLastModifiedDate = await inventory.findOne({ _id: inventoryData._id }, { lastModifiedDate: 1 } );
            if (inventoryLastModifiedDate && inventoryData.lastModifiedDate <= inventoryLastModifiedDate.lastModifiedDate) return null;

            const inventoryUpdatePromise = inventory
                .updateOne({ _id: inventoryData._id }, { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set: inventoryData }, { upsert: true })
                .then(() => inventoryData)
                .catch(originalError => {
                    throw createError.consumeInventoryMessage.failedUpdateInventory(originalError, inventoryData);
                });

            return Promise.all([inventoryUpdatePromise].concat(!inventoryData.skuId
                ? []
                : handleStyleUpdate(
                    skus,
                    styles,
                    {
                        skuId: inventoryData.skuId,
                        storeId: inventoryData.storeId,
                        availableToSell: inventoryData.availableToSell,
                        styleId: inventoryData.styleId
                    }
                )))
                .catch(originalError => {
                    throw createError.consumeInventoryMessage.failedUpdates(originalError, inventoryData);
                });
            })
        )
    )
    .then((results) => {
        const errors = results.filter((res) => res instanceof Error);
        const successes = results.filter((res) => !(res instanceof Error) && res);
        const successResults = successes.map((results) => results[0]);

        if (errors.length > 0) {
            const e = new Error(`${errors.length} of ${results.length} updates failed. See 'failedUpdatesErrors'.`);
            e.failedUpdatesErrors = errors;
            e.successfulUpdatesResults = successes;

            log('Failed to update some inventory records', "ERROR");
            log(e, "ERROR");
            
            return {
              messages: successResults,
              ...paramsExcludingMessages
            };
        } else {
            return {
              messages: successResults,
              ...paramsExcludingMessages
            };
        }
    })
    .catch(originalError => {
        throw createError.consumeInventoryMessage.failed(originalError, params);
    });
};

module.exports = global.main;
