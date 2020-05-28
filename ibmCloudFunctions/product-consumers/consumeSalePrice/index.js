/***
 * Listens for messages from Event Streams about the sale price of a style.
 */
const getCollection = require('../../lib/getCollection');
const {
    filterSalePriceMessages,
    parseSalePriceMessage,
} = require('../../lib/parseSalePriceMessage');
const createError = require('../../lib/createError');
const { log, createLog, addErrorHandling, addLoggingToMain } = require('../utils');

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
        .filter(addErrorHandling(filterSalePriceMessages))
        .map(addErrorHandling(parseSalePriceMessage))
        .map(addErrorHandling(async (update) => {
                  if (update.activityType === 'A' || update.activityType === 'C') {
                    const priceData = await prices.findOne({ _id: update._id }, { processDateCreated: 1 });

                    if (priceData && update.processDateCreated.getTime() <= priceData.processDateCreated.getTime()) {
                       return null;
                    }
                    return prices
                      .updateOne(
                          { _id: update._id },
                          { $currentDate: { lastModifiedInternalSalePrice: { $type:"timestamp" } }, $set: update },
                          { upsert: true }
                      )
                      .catch((originalError) => {
                          throw createError(originalError, update)
                      });
                  } else if (update.activityType === 'D') {
                    return prices
                      .deleteOne({ _id: update._id, processDateCreated: { $lt: update.processDateCreated } })
                      .catch((originalError) => {
                          throw createError.consumeSalePrice.failedToDelete(originalError, update)
                      });
                  } else {
                    throw createError.consumeSalePrice.activityTypeNotRecognized(null, update);
                  }

            })
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

global.main = addLoggingToMain(main);

module.exports = global.main;
