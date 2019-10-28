const getCollection = require('../../lib/getCollection');
const { filterSkuInventoryMessage, parseSkuInventoryMessage } = require('../../lib/parseSkuInventoryMessage');
const createError = require('../../lib/createError');
const { handleStyleUpdate } = require('./utils');

global.main = async function (params) {
    const { messages, ...paramsExcludingMessages } = params;
    const messagesIsArray = Array.isArray(messages);
    console.log(JSON.stringify({
        cfName: 'consumeSkuInventoryMessage',
        paramsExcludingMessages,
        messagesLength: messagesIsArray ? messages.length : null,
        messages: messagesIsArray ? messages.slice(10) : messages
        // Writing a large output to stdout is slow, and logs that are too long are truncated in logDNA anyways
    }));

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
        .filter(filterSkuInventoryMessage)
        .map(parseSkuInventoryMessage)
        .map((inventoryData) => {
            const inventoryUpdatePromise = inventory
                .updateOne({ _id: inventoryData._id }, { $set: inventoryData }, { upsert: true })
                .catch(originalError => {
                    return createError.consumeInventoryMessage.failedUpdateInventory(originalError, inventoryData);
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
                .catch(err => {
                    console.error('Problem with document ' + inventoryData._id);
                    console.error(err);
                    if (!(err instanceof Error)) {
                        const e = new Error();
                        e.originalError = err;
                        e.attemptedDocument = inventoryData;
                        return e;
                    }

                    err.attemptedDocument = inventoryData;
                    return err;
                });
            }
        )
    )
    .then((results) => {
        const errors = results.filter((res) => res instanceof Error);
        if (errors.length > 0) {
            const e = new Error(`${errors.length} of ${results.length} updates failed. See 'failedUpdatesErrors'.`);
            e.failedUpdatesErrors = errors;
            e.successfulUpdatesResults = results.filter((res) => !(res instanceof Error));
            throw e;
        }
    })
    .catch(originalError => {
        throw createError.consumeInventoryMessage.failed(originalError, paramsExcludingMessages);
    });
};

module.exports = global.main;
