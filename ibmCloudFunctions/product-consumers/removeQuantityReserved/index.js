const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const messagesLogs = require('../../lib/messagesLogs');
const { addLoggingToMain, createLog, log } = require('../utils');

const main = async function (params) {
    log(createLog.params('removeQuantityReserved', params));

    let skus;
    try {
        skus = await getCollection(params, params.collectionName);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError, params && params.collectionName);
    }

    try {
        const waitPeriod = 1800000; //30 minutes in milliseconds

        const cutOffTime = (new Date()).getTime() - waitPeriod;

        const findQuery = { quantitiesReserved: { $elemMatch: { lastModified: { $lte: cutOffTime } } } };
        const updateQuery = { $pull: { quantitiesReserved: { lastModified: { $lte: cutOffTime } } } };
        await skus.update(findQuery, updateQuery, { multi: true });
    } catch (originalError) {
        throw createError.removeQuantityReserved.failedToRemoveSomeReserves(originalError);
    }
}

global.main = addLoggingToMain(main, messagesLogs);

module.exports = global.main;
