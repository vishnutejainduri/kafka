const getCollection = require('../../lib/getCollection');
const { filterSkuInventoryMessage, parseSkuInventoryMessage } = require('../../lib/parseSkuInventoryMessage');
const createError = require('../../lib/createError');

const { handleStyleUpdate } = require('./utils');
const { createLog, addErrorHandling, log } = require('../utils');

global.main = async function (params) {
    log(createLog.params('consumeSkuInventoryMessage', params));
    // messages is not used, but paramsExcludingMessages is used
    // eslint-disable-next-line no-unused-vars
    const { messages, ...paramsExcludingMessages } = params;

    if (!params.topicName) {
        return { error: new Error('Requires an Event Streams topic.') };
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        return { error: new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field") };
    }

    const inventory = await getCollection(params)
        .catch(originalError => {
            return { error: createError.failedDbConnection(originalError) };
        });
    const styles = await getCollection(params, params.stylesCollectionName)
        .catch(originalError => {
            return { error: createError.failedDbConnection(originalError) };
        });
    const skus = await getCollection(params, params.skusCollectionName)
        .catch(originalError => {
            return { error: createError.failedDbConnection(originalError) };
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
        return { error: createError.consumeInventoryMessage.failed(originalError, params) };
    });
};

module.exports = global.main;
