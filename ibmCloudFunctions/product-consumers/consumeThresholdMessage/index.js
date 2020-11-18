const { parseThresholdMessage } = require('../../lib/parseThresholdMessage');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { addErrorHandling, log, createLog, addLoggingToMain, passDown } = require('../utils');

const addToAlgoliaQueue = (styleAvailabilityCheckQueue, skuData) => styleAvailabilityCheckQueue.updateOne({ _id : skuData.styleId }, { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set : { _id: skuData.styleId, styleId: skuData.styleId } }, { upsert: true }).catch(originalError => {
                                    throw createError.consumeThresholdMessage.failedAddToAlgoliaQueue(originalError, skuData);
                                })
const updateSkuThreshold = (skus, thresholdData) => skus.updateOne({ _id: thresholdData.skuId }, { $currentDate: { lastModifiedInternalThreshold: { $type:"timestamp" } }, $set: { threshold: thresholdData.threshold } }, { upsert: true }).catch(originalError => {
                                      throw createError.consumeThresholdMessage.failedToUpdateSkuThreshold(originalError, thresholdData);
                                  })

const main = async function (params) {
    log(createLog.params('consumeThresholdMessage', params));

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
    let styleAvailabilityCheckQueue;
    try {
      skus = await getCollection(params);
      styleAvailabilityCheckQueue = await getCollection(params, params.styleAvailabilityCheckQueue);
    } catch (originalError) {
      throw createError.failedDbConnection(originalError);
    }

    return Promise.all(params.messages
        .map(addErrorHandling(parseThresholdMessage))
        .map(addErrorHandling(async (thresholdData) => { 
              const skuData = await skus.findOne({ _id: thresholdData.skuId })
                .catch(originalError => {
                    throw createError.consumeThresholdMessage.failedToGetSku(originalError, thresholdData);
                });
              return Promise.all([skuData ? addToAlgoliaQueue(styleAvailabilityCheckQueue, skuData) : null, updateSkuThreshold(skus, thresholdData)])
                                .catch(originalError => {
                                    throw createError.consumeThresholdMessage.failedUpdates(originalError, thresholdData);
                                })
            })
        )
    )
    .catch(originalError => {
      throw createError.consumeThresholdMessage.failed(originalError, paramsExcludingMessages)
    })
    .then(passDown({ messages: params.messages, includeProcessedMessages: true }))
}

global.main = addLoggingToMain(main)

module.exports = global.main;
