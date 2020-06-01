/***
 * Listens for messages from Event Streams about the sale price of a style.
 */
const getCollection = require('../../lib/getCollection');
const {
    validateSalePriceMessages,
    parseSalePriceMessage,
} = require('../../lib/parseSalePriceMessage');
const createError = require('../../lib/createError');
const { log, createLog, addErrorHandling, addLoggingToMain, passDownAnyMessageErrors } = require('../utils');

const main = async function (params) {
    log(createLog.params("consumeSalePrice", params));

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    let prices;
    try {
        prices = await getCollection(params);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    return Promise.all(params.messages
        .map(addErrorHandling(validateSalePriceMessages))
        .map(addErrorHandling(parseSalePriceMessage))
        .map(addErrorHandling(async (update) => {
            // Specifying the exact fields here instead of the whole message,
            // because in the future parsed message might have a new field that doesn't exist in the previously stored data
            const priceIdentifier = {
                priceChangeId: update.priceChangeId,
                siteId: update.siteId,
                activityType: update.activityType,
                processDateCreated: update.processDateCreated,
                startDate: update.startDate,
                endDate: update.endDate,
                newRetailPrice: update.newRetailPrice
            }
            // The same price change entry might exist if the same messages is requeued for whatever reason e.g. a resync to add a new field to price data,
            // in that case we first delete the currently existing entry; will be no op if it doesn't exist
            await prices.updateOne({ styleId: update.styleId }, { $pull: { priceChanges: priceIdentifier } });
            await prices.updateOne({ styleId: update.styleId }, { $push: { priceChanges: update } }, { upsert: true });
        })))
        .then(passDownAnyMessageErrors)
        .catch(error => ({
            error
        }));
};

global.main = addLoggingToMain(main);

module.exports = global.main;
