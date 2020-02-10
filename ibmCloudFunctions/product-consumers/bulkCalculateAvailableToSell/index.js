const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { addErrorHandling, log, createLog } = require('../utils');
const { calculateStyleAts } = require('./utils');

global.main = async function (params) {
    log(createLog.params('bulkCalculateAvailableToSell', params));

    let bulkAtsRecalculateQueue;
    let styles;
    let skus;
    let stores;
    let inventory;
    let styleAvailabilityCheckQueue;
    try {
      bulkAtsRecalculateQueue = await getCollection(params)
      styles = await getCollection(params, params.stylesCollectionName)
      skus = await getCollection(params, params.skusCollectionName)
      stores = await getCollection(params, params.storesCollectionName)
      inventory = await getCollection(params, params.inventoryCollectionName)
      styleAvailabilityCheckQueue = await getCollection(params, params.styleAvailabilityCheckQueue)
    }
		catch(originalError) {
      throw createError.failedDbConnection(originalError);
    }

    const stylesToRecalcAts = await bulkAtsRecalculateQueue.find().sort({"insertTimestamp":1}).limit(20).toArray()
        .catch(originalError => {
            throw createError.bulkCalculateAvailableToSell.failedToGetRecords(originalError);
        });

    return Promise.all(stylesToRecalcAts
        .map(addErrorHandling(async (styleToRecalcAts) => {
          const { skuAtsOperations, styleAts, styleOnlineAts } = await calculateStyleAts(styleToRecalcAts, styles, skus, stores, inventory);
          const operationResults = await Promise.all([styles.updateOne({ _id: styleToRecalcAts._id }, { $currentDate: { lastModifiedInternalAts: { $type:"timestamp" } }, $set: { ats: styleAts, onlineAts: styleOnlineAts } })
                              .catch(originalError => {
                                  throw createError.bulkCalculateAvailableToSell.failedUpdateStyleAts(originalError, styleToRecalcAts);
                              })].concat(skuAtsOperations))
                              .catch(originalError => {
                                  throw createError.bulkCalculateAvailableToSell.failedAllAtsUpdates(originalError, stylesToRecalcAts);
                              })

          operationResults.map((operationResult) => {
            operationResult.styleToRecalcAts = styleToRecalcAts._id;
            return operationResult;
          })
          return operationResults;
        }))
    )
    .then(async (results) => {
        const errors = results.filter((res) => res instanceof Error);
        const successes = results.filter((res) => !(res instanceof Error));
        const successResults = successes.map((result) => result.map((res) => res.styleToRecalcAts));
        const successfulStyleIds = successResults.map((result) => result.filter((res, index) => result.indexOf(res) === index)[0]);

        if (successfulStyleIds.length > 0) {
          await Promise.all(successfulStyleIds.map((record) => styleAvailabilityCheckQueue.updateOne({ _id : record }, { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set : { _id: record, styleId: record } }, { upsert: true })))
          .catch(originalError => {
              throw createError.bulkCalculateAvailableToSell.failedToAddToAlgoliaQueue(originalError, successfulStyleIds);
          })
          .then(() => bulkAtsRecalculateQueue.deleteMany({ _id: { $in: successfulStyleIds } }))
          .catch(originalError => {
              throw createError.bulkCalculateAvailableToSell.failedToRemoveFromQueue(originalError, successfulStyleIds);
          })
        }

        if (errors.length > 0) {
            const e = new Error(`${errors.length} of ${results.length} updates failed. See 'failedUpdatesErrors'.`);
            e.failedUpdatesErrors = errors;
            e.successfulUpdatesResults = successes;

            throw e
        } 
    })
    .catch(originalError => {
        throw createError.bulkCalculateAvailableToSell.failedAllUpdates(originalError, stylesToRecalcAts);
    })
};

module.exports = global.main;
