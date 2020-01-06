const getCollection = require('../../lib/getCollection');
const { addErrorHandling, log, createLog } = require('../utils');
const createError = require('../../lib/createError');
const { handleStyleAtsRecalc } = require('./utils');

const parseStoreFulfillMessage = function (msg) {
    return {
        _id: msg.value.SITE_ID,
        id: msg.value.SITE_ID,
        canOnlineFulfill: msg.value.FULFILL_STATUS === 'Y' ? true : false
    };
};

global.main = async function (params) {
    console.log('test');
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
            const storeFulfillOperations = [];
            const currentStoreData = await stores.findOne({ _id: storeData._id });
            let bulkStyleAtsUpdates = bulkAtsRecalculateQueue.initializeUnorderedBulkOp();

            console.log(currentStoreData, storeData);

            if (currentStoreData.canOnlineFulfill !== storeData.canOnlineFulfill) {
              bulkStyleAtsUpdates = await handleStyleAtsRecalc(bulkStyleAtsUpdates, storeData, inventory);

              storeFulfillOperations.push(bulkStyleAtsUpdates.execute()
                                          .catch(originalError => {
                                              throw createError.consumeStoresFulfillMessage.failedBulkAtsInsert(originalError, bulkStyleAtsUpdates);
                                          }));
            }

            storeFulfillOperations.push(stores.updateOne({ _id: storeData._id }, { $set: storeData })
                                .then(() => log('Updated store fulfill ' + storeData._id))
                                .catch(originalError => {
                                    return createError.consumeStoresFulfillMessage.failedToUpdateStore(originalError, storeData._id);
                                }));

            return Promise.all(storeFulfillOperations);
        }))
    )
    .then((results) => {
        console.log('how', results);
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
