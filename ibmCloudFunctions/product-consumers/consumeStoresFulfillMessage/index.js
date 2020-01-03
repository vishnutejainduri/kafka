const getCollection = require('../../lib/getCollection');
const { addErrorHandling, log, createLog } = require('../utils');
const createError = require('../../lib/createError');

const parseStoreFulfillMessage = function (msg) {
    return {
        _id: msg.value.SITE_ID,
        id: msg.value.SITE_ID,
        canOnlineFulfill: msg.value.FULFILL_STATUS === 'Y' ? true : false
    };
};

global.main = async function (params) {
    log(createLog.params('consumeStoresFulfillMessage', params));
    // messages is not used, but paramsExcludingMessages is used
    // eslint-disable-next-line no-unused-vars
    const { messages, ...paramsExcludingMessages } = params;

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    let stores;
    let inventory;
    let bulkAtsRecalculateQueue;
    try {
        stores = await getCollection(params);
        inventory = await getCollection(params, params.inventoryCollectionName);
        bulkAtsRecalculateQueue = await getCollection(params, params.bulkAtsRecalculateQueue);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    return Promise.all(params.messages
        .filter(addErrorHandling((msg) => msg.topic === params.topicName))
        .map(addErrorHandling(parseStoreFulfillMessage))
        .map(addErrorHandling(async (storeData) => {
            const currentStoreData = await stores.findOne({ _id: storeData._id });

            if (currentStoreData.canOnlineFulfill !== storeData.canOnlineFulfill) {
              const unpaddedStoreId = parseInt(storeData._id, 10) 
              console.log('unpaddedStoreId', unpaddedStoreId);
              
              const recalcAtsStyles = await inventory.aggregate([{ $match: { storeId: unpaddedStoreId, availableToSell: { $gt:0 } } }, { $group: { _id: '$styleId' } } ]).toArray()
              const recalcAtsStyleIds = recalcAtsStyles.map((style) => {
                return {
                  _id: style._id,
                  insertTimestamp: (new Date()).getTime()
                };
              });
              console.log('recalcAtsStyleIds', recalcAtsStyleIds, recalcAtsStyleIds.length);

              await bulkAtsRecalculateQueue.insertMany(recalcAtsStyleIds)
              .then(result => {
                  console.log(`Successfully inserted ${result.insertedIds.length} items!`);
              })
              .catch(originalError => {
                  throw createError.consumeStoresFulfillMessage.failedBulkAtsInsert(originalError, recalcAtsStyleIds);
              })
            }

            return stores.updateOne({ _id: storeData._id }, { $set: storeData })
            .then(() => log('Updated store fulfill ' + storeData._id))
            .catch(originalError => {
                return createError.consumeStoresFulfillMessage.failedToUpdateStore(originalError, storeData._id);
            })
        }))
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
        throw createError.consumeStoresFulfillMessage.failed(originalError, paramsExcludingMessages);
    });
}

module.exports = global.main;
