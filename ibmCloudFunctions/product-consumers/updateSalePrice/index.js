/***
 * Listens for messages from Event Streams about the sale price of a style.
 */
const getCollection = require('../../lib/getCollection');
const {
    filterPriceMessages,
    parsePriceMessage,
    generateUpdateFromParsedMessage
} = require('../../lib/parsePriceMessage');
const { addErrorHandling } = require('../utils');
const createError = require('../../lib/createError');

global.main = async function (params) {
    console.log(JSON.stringify({
        cfName: 'updateSalePrice',
        params
    }));

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    let prices;
    let styles;
    try {
        styles = await getCollection(params);
        prices = await getCollection(params, params.pricesCollectionName);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    return Promise.all(params.messages
        .filter(filterPriceMessages)
        .map(parsePriceMessage)
        .map(addErrorHandling((update) => styles.findOne({ _id: update.styleId })
                .then(async (styleData) => {
                  const priceData = await prices.findOne({ _id: update.styleId });
                  const priceUpdate = generateUpdateFromParsedMessage (update, priceData, styleData);
                  priceUpdate._id = styleData._id;
                  priceUpdate.id = styleData._id;

                  return prices.updateOne(
                      { _id: priceUpdate._id },
                      { $set: priceUpdate },
                      { upsert: true }
                  ).catch((err) => {
                      console.error('Problem with sale price ' + update.styleId, update);
                      if (!(err instanceof Error)) {
                          const e = new Error();
                          e.originalError = err;
                          e.attemptedUpdate = update;
                          return e;
                      }
                      throw err;
                  })
            })
        )
    )).then((results) => {
        const errors = results.filter((res) => res instanceof Error);
        if (errors.length > 0) {
            const e = new Error(`${errors.length} of ${results.length} updates failed. See 'failedUpdatesErrors'.`);
            e.failedUpdatesErrors = errors;
            e.successfulUpdatesResults = results.filter((res) => !(res instanceof Error));
            throw e;
        }
    });
};

module.exports = global.main;
