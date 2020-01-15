/***
 * Listens for messages from Event Streams about the sale price of a style.
 */
const getCollection = require('../../lib/getCollection');
const {
    filterPriceMessages,
    parsePriceMessage,
    generateUpdateFromParsedMessage
} = require('../../lib/parsePriceMessage');
const createError = require('../../lib/createError');
const { log, createLog, addErrorHandling } = require('../utils');

global.main = async function (params) {
    log(createLog.params("updateSalePrice", params));

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
        .filter(addErrorHandling(filterPriceMessages))
        .map(addErrorHandling(parsePriceMessage))
        .map(addErrorHandling(async (update) => styles.findOne({ _id: update.styleId })
                .then(async (styleData) => {
                  const priceData = await prices.findOne({ _id: update.styleId });

                  if (!styleData) {
                    return null;
                  }

                  const priceUpdate = generateUpdateFromParsedMessage (update, priceData, styleData);
                  priceUpdate._id = styleData._id;
                  priceUpdate.id = styleData._id;

                  return prices.updateOne(
                      { _id: priceUpdate._id },
                    { $currentDate: { lastModifiedInternalSalePrice: { $type:"timestamp" } }, $set: update },
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
            const error = new Error(`${errors.length} of ${results.length} updates failed. See 'failedUpdatesErrors'.`);
            error.failedUpdatesErrors = errors;
            error.successfulUpdatesResults = results.filter((res) => !(res instanceof Error));
            throw error;
        }
    })
    .catch(error => ({
        error
    }));
};

module.exports = global.main;
