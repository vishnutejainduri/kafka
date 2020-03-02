const getCollection = require('../../lib/getCollection');
const { addErrorHandling, log, createLog } = require('../utils');
const createError = require('../../lib/createError');
const { filterStoreMessage, parseStoreMessage } = require('../../lib/parseStoreMessage');

global.main = async function (params) {
    log(createLog.params('consumeStoresMessage', params));
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
        .filter(addErrorHandling(filterStoreMessage))
        .map(addErrorHandling(parseStoreMessage))
        .map(addErrorHandling(async (storeData) => {
            const storeOperations = [];
            const currentStoreData = await stores.findOne({ _id: storeData._id });

            // delete store to later do a complete replace
            await stores.remove({ _id: storeData._id }, { justOne: true });

            if (currentStoreData.canOnlineFulfill !== storeData.canOnlineFulfill) {
              let bulkStyleAtsUpdates = bulkAtsRecalculateQueue.initializeUnorderedBulkOp();
              bulkStyleAtsUpdates = await handleStyleAtsRecalc(bulkStyleAtsUpdates, storeData, inventory);

              storeOperations.push(bulkStyleAtsUpdates.execute()
                                          .catch(originalError => {
                                              throw createError.consumeStoresFulfillMessage.failedBulkAtsInsert(originalError, bulkStyleAtsUpdates);
                                          }));
            }

            storeOperations.push(stores.updateOne({ _id: storeData._id }, { $set: storeData })
                                .catch(originalError => {
                                    throw createError.consumeStoresFulfillMessage.failedToUpdateStore(originalError, storeData._id);
                                }));

            return Promise.all(storeOperations);
        }))
        /*.map(addErrorHandling((storeData) => stores.updateOne({ _id: storeData._id }, { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set: storeData }, { upsert: true })
            .then(() => log('Updated/inserted store ' + storeData._id))
            .catch(originalError => {
                return createError.consumeStoresMessage.failedToUpdateStore(originalError, storeData._id);
            })
        ))*/
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
        throw createError.consumeStoresMessage.failed(originalError, paramsExcludingMessages);
    });
}

module.exports = global.main;
