const { parseStyleMessage, filterStyleMessages } = require('../../lib/parseStyleMessage');
const { priceChangeProcessStatus } = require('../constants')
const { addErrorHandling, log, createLog, addLoggingToMain, passDownProcessedMessages } = require('../utils');
const createError = require('../../lib/createError');
const getCollection = require('../../lib/getCollection');

const updateOriginalPrice = (prices, styleData) => prices.updateOne({ _id: styleData._id }, { $currentDate: { lastModifiedInternalOriginalPrice: { $type:"timestamp" } }, $set: { _id: styleData._id, styleId: styleData._id, originalPrice: styleData.originalPrice } }, { upsert: true }).catch(originalError => {
    throw createError.consumeCatalogMessage.failedPriceUpdates(originalError, styleData);
})
const updateOriginalPriceProcessedFlag = (prices, styleData) => prices.updateOne({ _id: styleData._id, 'priceChanges.originalPriceProcessed': { $exists: true } }, { $set: { 'priceChanges.$.originalPriceProcessed': priceChangeProcessStatus.false } }).catch(originalError => {
    throw createError.consumeCatalogMessage.failedPriceUpdates(originalError, styleData);
})
const updateOriginalPriceProcessedFlagCT = (prices, styleData) => prices.updateOne({ _id: styleData._id, 'priceChanges.originalPriceProcessedCT': { $exists: true } }, { $set: { 'priceChanges.$.originalPriceProcessedCT': priceChangeProcessStatus.false } }).catch(originalError => {
    throw createError.consumeCatalogMessage.failedPriceUpdates(originalError, styleData);
})

const main = async function (params) {
    log(createLog.params('consumeCatalogMessage', params));

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    let styles;
    let prices;
    let bulkAtsRecalculateQueue;
    try {
        styles = await getCollection(params);
        prices = await getCollection(params, params.pricesCollectionName);
        bulkAtsRecalculateQueue = await getCollection(params, params.bulkAtsRecalculateQueue);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    return Promise.all(params.messages
        .map(addErrorHandling(msg => filterStyleMessages(msg) ? msg : null))
        .map(addErrorHandling(parseStyleMessage))
        .map(addErrorHandling(async (styleData) => {
          const priceOperations = [updateOriginalPrice(prices, styleData), updateOriginalPriceProcessedFlag(prices, styleData), updateOriginalPriceProcessedFlagCT(prices, styleData)];

          let operations = [];

          const existingDocument = await styles.findOne({ _id: styleData._id })
          if (existingDocument) {
            if (existingDocument.lastModifiedDate <= styleData.lastModifiedDate) {
              operations.push(styles.updateOne({ _id: styleData._id }, { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set: styleData })
              .catch(originalError => {
                  throw createError.consumeCatalogMessage.failedStyleUpdates(originalError, styleData);
              }))
              operations = operations.concat(priceOperations);
              
              if (existingDocument.departmentId && existingDocument.departmentId !== styleData.departmentId && (styleData.departmentId === '27' || existingDocument.departmentId === '27')) {
                operations.push(bulkAtsRecalculateQueue.insertOne({ _id: styleData._id, insertTimestamp: styleData.effectiveDate })
                .catch(originalError => {
                    throw createError.consumeCatalogMessage.failedBulkAtsInsert(originalError, styleData);
                }))
              }
            }
          } else {
            operations.push(styles.updateOne({ _id: styleData._id }, { $set: styleData }, { upsert: true })
            .catch(originalError => {
                throw createError.consumeCatalogMessage.failedStyleUpdates(originalError, styleData);
            }))
            operations = operations.concat(priceOperations);
          }

          return Promise.all(operations)
                            .catch(originalError => {
                              throw createError.consumeCatalogMessage.failed(originalError);
                            })
        }))
    ).then(passDownProcessedMessages(params.messages))
    .catch(originalError => {
        throw createError.consumeCatalogMessage.failed(originalError, params);
    });
}

global.main = addLoggingToMain(main);

module.exports = global.main;
