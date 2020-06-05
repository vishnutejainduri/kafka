/***
 * Listens for messages from Event Streams about the sale price of a style.
 */
const getCollection = require('../../lib/getCollection');
const {
    validateSalePriceMessages,
    parseSalePriceMessage,
} = require('../../lib/parseSalePriceMessage');
const createError = require('../../lib/createError');
const { log, createLog, addErrorHandling, addLoggingToMain, passDownProcessedMessages } = require('../utils');

const main = async function (params) {
    log(createLog.params("consumeSalePrice", params));

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    let pricesCollection;
    try {
        pricesCollection = await getCollection(params);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    return Promise.all(params.messages
        .map(addErrorHandling(validateSalePriceMessages))
        .map(addErrorHandling(parseSalePriceMessage))
        .map(addErrorHandling(async (update) => {
            const { styleId, ...priceChangeUpdate } = update
            // The same price change entry might exist if the same messages is requeued for whatever reason e.g. a resync to add a new field to price data,
            // in that case we first delete the currently existing entry; will be no op if it doesn't exist
            const findDuplicatePriceChangeQuery = Object.entries(priceChangeUpdate).reduce((query, [key, value]) => {
                query.$and.push({
                    $or: [{ [key]: { $exists: false } }, { [key]: value}]
                })
                return query
            }, { $and: [] })
            await pricesCollection.updateOne({ styleId: styleId }, { $pull: { priceChanges: findDuplicatePriceChangeQuery } });
            await pricesCollection.updateOne({ styleId: styleId }, { $push: { priceChanges: priceChangeUpdate } }, { upsert: true });
        })))
        .then(passDownProcessedMessages(params.messages))
        .catch(error => ({
            error
        }));
};

global.main = addLoggingToMain(main);

module.exports = global.main;
