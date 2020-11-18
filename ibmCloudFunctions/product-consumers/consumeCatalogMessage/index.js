const { parseStyleMessage, filterStyleMessages } = require('../../lib/parseStyleMessage');
const { addErrorHandling, log, createLog, addLoggingToMain, passDown } = require('../utils');
const createError = require('../../lib/createError');
const getCollection = require('../../lib/getCollection');
const {
  updateOriginalPrice,
  updateOriginalPriceProcessedFlag,
  updateOriginalPriceProcessedFlagCT,
  upsertStyle,
  hasDepertmentIdChangedFrom27,
  addStyleToBulkATSQueue
} = require('./utils');

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
          const priceOperations = [
            updateOriginalPrice(prices, styleData),
            updateOriginalPriceProcessedFlag(prices, styleData),
            updateOriginalPriceProcessedFlagCT(prices, styleData)
          ];

          let operations = [];

          const existingDocument = await styles.findOne({ _id: styleData._id })
          if (existingDocument) {
            if (existingDocument.lastModifiedDate <= styleData.lastModifiedDate) {
              operations.push(upsertStyle(styles, styleData, false))
              operations = operations.concat(priceOperations);
              
              if (hasDepertmentIdChangedFrom27(existingDocument, styleData)) {
                operations.push(addStyleToBulkATSQueue(bulkAtsRecalculateQueue, styleData));
              }
            }
          } else {
            operations.push(upsertStyle(styles, styleData, true))
            operations = operations.concat(priceOperations);
          }

          return Promise.all(operations)
                            .catch(originalError => {
                              throw createError.consumeCatalogMessage.failed(originalError);
                            })
        }))
    ).then(passDown({ messages: params.messages, includeProcessedMessages: true }))
    .catch(originalError => {
        throw createError.consumeCatalogMessage.failed(originalError, params);
    });
}

global.main = addLoggingToMain(main);

module.exports = global.main;
