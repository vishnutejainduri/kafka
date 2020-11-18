/***
 * Listens for messages from Event Streams about the sale price of a style.
 */
const getCollection = require('../../lib/getCollection');
const {
    validateSalePriceMessages,
    parseSalePriceMessage,
} = require('../../lib/parseSalePriceMessage');
const createError = require('../../lib/createError');
const { log, createLog, addErrorHandling, addLoggingToMain, passDown } = require('../utils');
const { priceChangeProcessStatus } = require('../constants')
const { groupByAttribute } = require('../../lib/utils');

const groupByStyleId = groupByAttribute('styleId');

const main = async function (params) {
    log(createLog.params("consumeSalePrice", params));

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    let pricesCollection;
    try {
        pricesCollection = await getCollection(params);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    const priceRecords = (params.messages
        .map(addErrorHandling(validateSalePriceMessages))
        .map(addErrorHandling(parseSalePriceMessage)))
    const pricesGroupedByStyleId = groupByStyleId(priceRecords);

    return Promise.all(pricesGroupedByStyleId
        .map(addErrorHandling(async (batchedUpdate) => {
            for (const update of batchedUpdate) {
              const { styleId, ...priceChangeUpdate } = update
              // delete price type as that's only relevant for CT and just makes our mongo messier if we have it there with no gain
              delete priceChangeUpdate.priceType
              const priceProcessedFlags =  {
                startDateProcessed: priceChangeProcessStatus.false,
                endDateProcessed: priceChangeProcessStatus.false,
                originalPriceProcessed: priceChangeProcessStatus.true,
                startDateProcessedCT: priceChangeProcessStatus.false,
                endDateProcessedCT: priceChangeProcessStatus.false,
                originalPriceProcessedCT: priceChangeProcessStatus.true
              };
              const priceChangeUpdateWithProcessFlagSet = { ...priceChangeUpdate, ...priceProcessedFlags }

              let newPriceRecord = {};
              const currentPriceRecord = await pricesCollection.findOne({ styleId });
              if (!currentPriceRecord) {
                newPriceRecord = { _id: styleId, id: styleId, styleId, priceChanges: [priceChangeUpdateWithProcessFlagSet] };
              } else if (!currentPriceRecord.priceChanges) {
                newPriceRecord = { ...currentPriceRecord, priceChanges: [priceChangeUpdateWithProcessFlagSet] }
              } else {
                // The same price change entry might exist if the same messages is requeued for whatever reason e.g. a resync to add a new field to price data,
                // in that case we first delete the currently existing entry
                currentPriceRecord.priceChanges = currentPriceRecord.priceChanges.filter(priceChange => {
                  let isDuplicate = true;
                  for (const key of Object.keys(priceChangeUpdate)) {
                    const compare1 = priceChangeUpdate[key] instanceof Date
                      ? priceChangeUpdate[key].getTime()
                      : priceChangeUpdate[key]
                    const compare2 = priceChangeUpdate[key] instanceof Date
                      ? priceChange[key].getTime()
                      : priceChange[key]

                    isDuplicate = compare1 === compare2 
                    if (!isDuplicate) break;
                  }
                  return !isDuplicate;
                });
                newPriceRecord = { ...currentPriceRecord, priceChanges: currentPriceRecord.priceChanges.concat([priceChangeUpdateWithProcessFlagSet]) }
              }

              await pricesCollection.updateOne({ styleId: styleId }, { $set: newPriceRecord }, { upsert: true })
          }
        })))
        .then(passDown({ batches: pricesGroupedByStyleId, messages: params.messages }))
        .catch(error => ({
            error
        }));
};

global.main = addLoggingToMain(main);

module.exports = global.main;
