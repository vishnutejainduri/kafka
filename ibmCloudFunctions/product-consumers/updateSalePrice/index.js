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
    console.log(JSON.stringify({
        cfName: 'updateSalePrice',
        params
    }));

    if (!params.topicName) {
        throw { error: new Error('Requires an Event Streams topic.') };
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw { error: new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field") };
    }

    let prices;
    try {
        prices = await getCollection(params, params.pricesCollectionName);
    } catch (originalError) {
        throw { error: createError.failedDbConnection(originalError) };
    }

    return Promise.all(params.messages
        .filter(filterPriceMessages)
        .map(parsePriceMessage)
        .map(generateUpdateFromParsedMessage)
        .map((update) => {
                return prices.updateOne(
                    { _id: update._id },
                    { $set: update },
                    { upsert: true }
                ).catch((err) => {
                    console.error('Problem with sale price ' + update.styleId, update);
                    if (!(err instanceof Error)) {
                        const e = new Error();
                        e.originalError = err;
                        e.attemptedUpdate = update;
                        return e;
                    }
                    return err;
                })
            }
        )
    ).then((results) => {
        const errors = results.filter((res) => res instanceof Error);
        if (errors.length > 0) {
            const e = new Error(`${errors.length} of ${results.length} updates failed. See 'failedUpdatesErrors'.`);
            e.failedUpdatesErrors = errors;
            e.successfulUpdatesResults = results.filter((res) => !(res instanceof Error));
            throw { error: e };
        }
    });
};

module.exports = global.main;
