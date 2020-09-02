const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const messagesLogs = require('../../lib/messagesLogs');
const { addLoggingToMain, createLog, log } = require('../utils');

const main = async function (params) {
    log(createLog.params('removeQuantityReserved', params));

    let skus;
    let styleAvailabilityCheckQueue;
    try {
        skus = await getCollection(params, params.collectionName);
        styleAvailabilityCheckQueue = await getCollection(params, params.styleAvailabilityCheckQueue);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError, params && params.collectionName);
    }

    try {
        const waitPeriod = 1800000; //30 minutes in milliseconds

        const cutOffTime = (new Date()).getTime() - waitPeriod;

        const findQuery = { quantitiesReserved: { $elemMatch: { lastModified: { $lte: cutOffTime } } } };
        const updateQuery = { $pull: { quantitiesReserved: { lastModified: { $lte: cutOffTime } } } };
        const skusToUpdate = await skus.find(findQuery).toArray();
        const removeReservesQuery = skus.update(findQuery, updateQuery, { multi: true });
        await Promise.all([removeReservesQuery].concat(skusToUpdate.map(sku => 
          styleAvailabilityCheckQueue.updateOne({ _id : sku.styleId }, { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set : { _id: sku.styleId, styleId: sku.styleId } }, { upsert: true })
        )))
    } catch (originalError) {
        throw createError.removeQuantityReserved.failedToRemoveSomeReserves(originalError);
    }
}

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
