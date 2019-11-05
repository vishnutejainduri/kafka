const getCollection = require('../../lib/getCollection');
const { filterSkuInventoryMessage, parseSkuInventoryMessage } = require('../../lib/parseSkuInventoryMessage');
const createError = require('../../lib/createError');
const { createLog, log } = require('../utils');

const { handleStyleUpdate } = require('./utils');
const { addErrorHandling, log } = require('../utils');

global.main = async function (params) {
    log(createLog.params('consumeSkuInventoryMessage', params));

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    const [inventory, styles, skus] = await Promise.all([
        getCollection(params),
        getCollection(params, params.stylesCollectionName),
        getCollection(params, params.skusCollectionName)
    ]).catch(originalError => {
        throw createError.failedDbConnection(originalError);
    });

    return Promise.all(params.messages
        .filter(addErrorHandling(filterSkuInventoryMessage))
        .map(addErrorHandling(parseSkuInventoryMessage))
        .map(addErrorHandling((inventoryData) => {
            const inventoryUpdatePromise = inventory
                .updateOne({ _id: inventoryData._id }, { $set: inventoryData }, { upsert: true })
                .then(() => inventoryData)
                .catch(originalError => {
                    throw createError.consumeInventoryMessage.failedUpdateInventory(originalError, inventoryData);
                });

            const styleUpdatePromise = !inventoryData.skuId
                ? null
                : handleStyleUpdate(
                    skus,
                    styles,
                    {
                        skuId: inventoryData.skuId,
                        storeId: inventoryData.storeId,
                        quantityOnHandSellable: inventoryData.quantityOnHandSellable,
                        styleId: inventory.styleId
                    }
                );

            return Promise.all([inventoryUpdatePromise].concat(styleUpdatePromise !== null ? [styleUpdatePromise] : []))
                .catch(originalError => {
                    return createError.consumeInventoryMessage.failedUpdates(originalError, inventoryData);
                });
            })
        )
    )
    .then((results) => {
        const errors = results.filter((res) => res instanceof Error);
        const successes = results.filter((res) => !(res instanceof Error));
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
