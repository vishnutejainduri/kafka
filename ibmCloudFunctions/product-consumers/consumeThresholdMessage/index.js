const { parseThresholdMessage } = require('../../lib/parseThresholdMessage');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { addErrorHandling, log, createLog } = require('../utils');
const messagesLogs = require('../../lib/messagesLogs');

global.main = async function (params) {
    log(createLog.params('consumeThresholdMessage', params));
    messagesLogs.storeBatch(params);

    // messages is not used, but paramsExcludingMessages is used
    // eslint-disable-next-line no-unused-vars
    const { messages, ...paramsExcludingMessages } = params;

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    let skus;
    let styles;
    let styleAvailabilityCheckQueue;
    try {
      skus = await getCollection(params);
      styles = await getCollection(params, params.stylesCollectionName);
      styleAvailabilityCheckQueue = await getCollection(params, params.styleAvailabilityCheckQueue);
    } catch (originalError) {
      throw createError.failedDbConnection(originalError);
    }

    return Promise.all(params.messages
        .map(addErrorHandling(parseThresholdMessage))
        .map(addErrorHandling(async (thresholdData) => { 
              const thresholdOperations = [];
              const skuData = await skus.findOne({ _id: thresholdData.skuId })
                .catch(originalError => {
                    throw createError.consumeThresholdMessage.failedToGetSku(originalError, thresholdData);
                });
              const styleData = await styles.findOne({ _id: skuData.styleId })
                .catch(originalError => {
                    throw createError.consumeThresholdMessage.failedToGetStyle(originalError, thresholdData);
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
        
                styleUpdates['$currentDate'] = { lastModifiedInternalThreshold: { $type:"timestamp" } };
                thresholdOperations.push(styles.updateOne({ _id: styleData._id }, styleUpdates)
                                  .catch(originalError => {
                                      throw createError.consumeThresholdMessage.failedToUpdateStyleThreshold(originalError, styleData);
                                  }),
                                  styleAvailabilityCheckQueue.updateOne({ _id : styleData._id }, { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set : { _id: styleData._id, styleId: styleData._id } }, { upsert: true })
                                  .catch(originalError => {
                                      throw createError.consumeThresholdMessage.failedAddToAlgoliaQueue(originalError, styleData);
                                  }));
              }
  
              thresholdOperations.push(skus.updateOne({ _id: thresholdData.skuId }, { $currentDate: { lastModifiedInternalThreshold: { $type:"timestamp" } }, $set: { threshold: thresholdData.threshold } })
                                  .catch(originalError => {
                                      throw createError.consumeThresholdMessage.failedToUpdateSkuThreshold(originalError, thresholdData);
                                  }));

              return Promise.all(thresholdOperations)
                                  .catch(originalError => {
                                      throw createError.consumeThresholdMessage.failedUpdates(originalError, thresholdData);
                                  })
            })
        )
    )
    .catch(originalError => {
        return {
            error: createError.consumeThresholdMessage.failed(originalError, paramsExcludingMessages)
        };
    })
    .then((results) => {
        const errors = results.filter((res) => res instanceof Error);
        if (errors.length > 0) {
            throw createError.consumeThresholdMessage.partialFailure(params.messages, errors);
        }
    })
}

module.exports = global.main;
