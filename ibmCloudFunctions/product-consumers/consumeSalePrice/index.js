/***
 * Listens for messages from Event Streams about the sale price of a style.
 */
const getCollection = require('../../lib/getCollection');
const {
    validateSalePriceMessages,
    parseSalePriceMessage,
} = require('../../lib/parseSalePriceMessage');
const createError = require('../../lib/createError');
const { log, createLog, addErrorHandling, addLoggingToMain, passDownProcessedMessages } = require('../utils');
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

    return Promise.all(params.messages
        .map(addErrorHandling(async (update) => {
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
              console.log('1');
              console.log('priceChangeUpdateWithProcessFlagSet', priceChangeUpdateWithProcessFlagSet);
              newPriceRecord = { _id: styleId, id: styleId, styleId, priceChanges: [priceChangeUpdateWithProcessFlagSet] };
            } else if (!currentPriceRecord.priceChanges) {
              console.log('2');
              console.log('priceChangeUpdateWithProcessFlagSet', priceChangeUpdateWithProcessFlagSet);
              newPriceRecord = { ...currentPriceRecord, priceChanges: [priceChangeUpdateWithProcessFlagSet] }
            } else {
              console.log('3');
              // The same price change entry might exist if the same messages is requeued for whatever reason e.g. a resync to add a new field to price data,
              // in that case we first delete the currently existing entry
              currentPriceRecord.priceChanges = currentPriceRecord.priceChanges.filter(priceChange => {
                let isDuplicate = true;
                for (const key of Object.keys(priceChangeUpdate)) {
                  isDuplicate = priceChangeUpdate[key] === priceChange[key]
                  console.log(`${isDuplicate} ${key} ${priceChangeUpdate[key]} ${priceChange[key]}`);
                  if (!isDuplicate) break;
                }
                return !isDuplicate;
              });
              console.log('currentPriceRecord.priceChanges', currentPriceRecord.priceChanges);
              console.log('priceChangeUpdateWithProcessFlagSet', priceChangeUpdateWithProcessFlagSet);
              newPriceRecord = { ...currentPriceRecord, priceChanges: currentPriceRecord.priceChanges.concat([priceChangeUpdateWithProcessFlagSet]) }
            }

            await pricesCollection.updateOne({ styleId: styleId }, { $set: newPriceRecord }, { upsert: true })
        })))
        .then(passDownProcessedMessages(params.messages))
        .catch(error => ({
            error
        }));
};

global.main = addLoggingToMain(main);

module.exports = global.main;
