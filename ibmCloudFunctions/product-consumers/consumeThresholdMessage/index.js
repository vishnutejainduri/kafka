const { parseThresholdMessage } = require('../../lib/parseThresholdMessage');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { addErrorHandling, log } = require('../utils');

global.main = async function (params) {
    const { messages, ...paramsExcludingMessages } = params;
    const messagesIsArray = Array.isArray(messages);
    console.log(JSON.stringify({
        cfName: 'consumeThresholdMessage',
        paramsExcludingMessages,
        messagesLength: messagesIsArray ? messages.length : null,
        messages // outputting messages as the last parameter because if it is too long the rest of the log will be truncated in logDNA
    }));

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    const [skus, styles, styleAvailabilityCheckQueue] = await Promise.all([
        getCollection(params),
        getCollection(params, params.stylesCollectionName),
        getCollection(params, params.styleAvailabilityCheckQueue)
    ]).catch(originalError => {
        throw createError.failedDbConnection(originalError);
    });

    return Promise.all(params.messages
        .map(addErrorHandling(parseThresholdMessage))
        .map(addErrorHandling(async (thresholdData) => { 
              const thresholdOperations = [];
              const skuData = await skus.findOne({ _id: thresholdData.skuId })
                .catch(originalError => {
                    return createError.consumeThresholdMessage.failedToGetSku(originalError, thresholdData);
                });
              const styleData = await styles.findOne({ _id: skuData.styleId })
                .catch(originalError => {
                    return createError.consumeThresholdMessage.failedToGetStyle(originalError, thresholdData);
                });

              const styleUpdates = { $set: {} };

              if (styleData && (styleData.ats || styleData.onlineAts)) {
                if (styleData.ats) {
                  styleUpdates["$set"]["ats"] = styleData.ats.map((atsRecord) => {
                    if (atsRecord.skuId === thresholdData.skuId) {
                      atsRecord.threshold = thresholdData.threshold
                    }
                    return atsRecord;
                  });
                }
                if (styleData.onlineAts) {
                  styleUpdates["$set"]["onlineAts"] = styleData.onlineAts.map((atsRecord) => {
                    if (atsRecord.skuId === thresholdData.skuId) {
                      atsRecord.threshold = thresholdData.threshold
                    }
                    return atsRecord;
                  });
                }
                thresholdOperations.push(styles.updateOne({ _id: styleData._id }, styleUpdates)
                                  .catch(originalError => {
                                      throw createError.consumeThresholdMessage.failedToUpdateStyleThreshold(originalError, styleData);
                                  }),
                                  styleAvailabilityCheckQueue.updateOne({ _id : styleData._id }, { $set : { _id: styleData._id, styleId: styleData._id } }, { upsert: true })
                                  .catch(originalError => {
                                      throw createError.consumeThresholdMessage.failedAddToAlgoliaQueue(originalError, styleData);
                                  }));
              }
  
              thresholdOperations.push(skus.updateOne({ _id: thresholdData.skuId }, { $set: { threshold: thresholdData.threshold } })
                                  .catch(originalError => {
                                      throw createError.consumeThresholdMessage.failedToUpdateSkuThreshold(originalError, thresholdData);
                                  }));

              return Promise.all(thresholdOperations)
                                  .catch(originalError => {
                                      return createError.consumeThresholdMessage.failedUpdates(originalError, thresholdData);
                                  })
            })
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
        throw createError.consumeThresholdMessage.failed(originalError, paramsExcludingMessages);
    });
}

module.exports = global.main;
