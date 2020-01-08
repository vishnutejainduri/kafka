/***
 * Listens for messages from Event Streams about the sale price of a style.
 */
const getCollection = require('../../lib/getCollection');
const {
    filterPriceMessages,
    parsePriceMessage,
    IN_STORE_SITE_ID,
    ONLINE_SITE_ID
} = require('../../lib/parsePriceMessage');
const createError = require('../../lib/createError');
const { log, createLog, addErrorHandling } = require('../utils');

function generateUpdateFromParsedMessage(priceData) {
    const updateToProcess = {
        _id: priceData.styleId,
        id: priceData.styleId
    };
    switch (priceData.siteId) {
        case ONLINE_SITE_ID:
            updateToProcess.onlineSalePrice = priceData.newRetailPrice;
            break;
        case IN_STORE_SITE_ID:
            updateToProcess.inStoreSalePrice = priceData.newRetailPrice;
            break;
        default:
            break;
    }
    return updateToProcess;
}

global.main = async function (params) {
    log(createLog.params("updateSalePrice", params));

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    let prices;
    try {
        prices = await getCollection(params, params.pricesCollectionName);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    return Promise.all(params.messages
        .filter(addErrorHandling(filterPriceMessages))
        .map(addErrorHandling(parsePriceMessage))
        .map(addErrorHandling(generateUpdateFromParsedMessage))
        .map(addErrorHandling(async update => prices.updateOne({ _id: update._id }, { $set: update }, { upsert: true })))
    ).then((results) => {
        const errors = results.filter((res) => res instanceof Error);
        if (errors.length > 0) {
            const error = new Error(`${errors.length} of ${results.length} updates failed. See 'failedUpdatesErrors'.`);
            error.failedUpdatesErrors = errors;
            error.successfulUpdatesResults = results.filter((res) => !(res instanceof Error));
            return {
                error
            };
        }
    });
};

module.exports = global.main;
