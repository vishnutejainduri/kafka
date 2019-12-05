const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { addErrorHandling, log, createLog } = require('../utils');

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
          const styleData = await styles.findOne({ _id: styleToRecalcAts._id })
          .catch(originalError => {
              throw createError.bulkCalculateAvailableToSell.failedGetStyle(originalError, styleToRecalcAts);
          })
          if (!styleData) return null;
          const styleAts = [];
          const styleOnlineAts = [];

          const skuRecords = await skus.find({ styleId: styleToRecalcAts._id }).toArray()
          .catch(originalError => {
              throw createError.bulkCalculateAvailableToSell.failedGetSku(originalError, styleToRecalcAts);
          })
          
          const skuAtsOperations = [];
          await Promise.all(skuRecords.map(addErrorHandling(async (skuRecord) => {
              const skuAts = [];
              const skuOnlineAts = [];

              const inventoryRecords = await inventory.find({ skuId: skuRecord._id, availableToSell: { $gt: 0 } }).toArray()
              .catch(originalError => {
                  throw createError.bulkCalculateAvailableToSell.failedGetInventory(originalError, skuRecord);
              })

              await Promise.all(inventoryRecords.map(addErrorHandling(async (inventoryRecord) => {
                  const storeData = await stores.findOne({ _id: inventoryRecord.storeId.toString().padStart(5, '0') })
                  .catch(originalError => {
                      throw createError.bulkCalculateAvailableToSell.failedGetStore(originalError, inventoryRecord);
                  })
                  if (inventoryRecord.availableToSell > 0) {
                    skuAts.push({
                      storeId: inventoryRecord.storeId,
                      availableToSell: inventoryRecord.availableToSell
                    })
                    if ((storeData.canOnlineFulfill && styleData.departmentId !== "27") || (storeData.canFulfillDep27 && styleData.departmentId === "27")) {
                      skuOnlineAts.push({
                        storeId: inventoryRecord.storeId,
                        availableToSell: inventoryRecord.availableToSell
                      })
                    }
                  }
              })));
              if (skuAts.length > 0) {
                styleAts.push({
                  skuId: skuRecord._id,
                  threshold: skuRecord.threshold,
                  ats: skuAts
                })
              }
              if (skuOnlineAts.length > 0) {
                styleOnlineAts.push({
                  skuId: skuRecord._id,
                  threshold: skuRecord.threshold,
                  ats: skuOnlineAts
                })
              }

              skuAtsOperations.push(skus.updateOne({ _id: skuRecord._id }, { $set: { ats: skuAts, onlineAts: skuOnlineAts } })
              .catch(originalError => {
                  throw createError.bulkCalculateAvailableToSell.failedUpdateSkuAts(originalError, skuRecord);
              }))
          })))
          const operationResults = await Promise.all([styles.updateOne({ _id: styleToRecalcAts._id }, { $set: { ats: styleAts, onlineAts: styleOnlineAts } })
                              .catch(originalError => {
                                  throw createError.bulkCalculateAvailableToSell.failedUpdateStyleAts(originalError, styleToRecalcAts);
                              })].concat(skuAtsOperations))
                              .catch(originalError => {
                                  throw createError.bulkCalculateAvailableToSell.failedAllAtsUpdates(originalError, stylesToRecalcAts);
                              })

          operationResults.map(addErrorHandling((operationResult) => {
            operationResult.styleToRecalcAts = styleToRecalcAts._id;
            return operationResult;
          }))
          return operationResults;
        }))
    )
    .then(async (results) => {
        const errors = results.filter((res) => res instanceof Error);
        const successes = results.filter((res) => !(res instanceof Error));
        const successResults = successes.map((result) => result.map((res) => res.styleToRecalcAts));
        const successfulStyleIds = successResults.map((result) => result.filter((res, index) => result.indexOf(res) === index)[0]);

        if (errors.length > 0) {
            const e = new Error(`${errors.length} of ${results.length} updates failed. See 'failedUpdatesErrors'.`);
            e.failedUpdatesErrors = errors;
            e.successfulUpdatesResults = results.filter((res) => !(res instanceof Error));

            if (successfulStyleIds.length > 0) {
               return await Promise.all(successfulStyleIds.map((record) => styleAvailabilityCheckQueue.updateOne({ _id : record }, { $set : { _id: record, styleId: record } }, { upsert: true })))
              .catch(originalError => {
                  throw createError.bulkCalculateAvailableToSell.failedToAddToAlgoliaQueue(originalError, successfulStyleIds);
              })
              .then(() => bulkAtsRecalculateQueue.deleteMany({ _id: { $in: successfulStyleIds } }))
              .catch(originalError => {
                  throw createError.bulkCalculateAvailableToSell.failedToRemoveFromQueue(originalError, successfulStyleIds);
              })
              .then(() => { 
                throw e
              })
            } else {
              throw e
            }
        } else {
						return await Promise.all(successfulStyleIds.map((record) => styleAvailabilityCheckQueue.updateOne({ _id : record }, { $set : { _id: record, styleId: record } }, { upsert: true })))
						.catch(originalError => {
								throw createError.bulkCalculateAvailableToSell.failedToAddToAlgoliaQueue(originalError, successfulStyleIds);
						})
						.then(() => bulkAtsRecalculateQueue.deleteMany({ _id: { $in: successfulStyleIds } }))
						.catch(originalError => {
								throw createError.bulkCalculateAvailableToSell.failedToRemoveFromQueue(originalError, successfulStyleIds);
						})
        }
    })
    .catch(originalError => {
        throw createError.bulkCalculateAvailableToSell.failedAllUpdates(originalError, stylesToRecalcAts);
    })
};

module.exports = global.main;
