const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { addErrorHandling, log, createLog } = require('../utils');

global.main = async function (params) {
    log(createLog.params('bulkCalculateAvailableToSell', params));

    const bulkAtsRecalculateQueue = await getCollection(params)
        .catch(originalError => {
            return { error: createError.failedDbConnection(originalError, params && params.collectionName) };
        });
    const styles = await getCollection(params, params.stylesCollectionName)
        .catch(originalError => {
            return { error: createError.failedDbConnection(originalError) };
        });
    const skus = await getCollection(params, params.skusCollectionName)
        .catch(originalError => {
            return { error: createError.failedDbConnection(originalError) };
        });
    const stores = await getCollection(params, params.storesCollectionName)
        .catch(originalError => {
            return { error: createError.failedDbConnection(originalError) };
        });
    const inventory = await getCollection(params, params.inventoryCollectionName)
        .catch(originalError => {
            return { error: createError.failedDbConnection(originalError) };
        });

    const stylesToRecalcAts = await bulkAtsRecalculateQueue.find().sort({"insertTimestamp":1}).limit(20).toArray();

    return Promise.all(stylesToRecalcAts
        .map(addErrorHandling(async (styleToRecalcAts) => {
          const styleData = await styles.findOne({ _id: styleToRecalcAts._id })
          .catch(originalError => {
              return { error: createError.bulkCalculateAvailableToSell.failedGetStyle(originalError, styleToRecalcAts) }
          })
          if (!styleData) return null;
          const styleAts = [];
          const styleOnlineAts = [];

          const skuRecords = await skus.find({ styleId: styleToRecalcAts._id }).toArray()
          .catch(originalError => {
              return { error: createError.bulkCalculateAvailableToSell.failedGetSku(originalError, styleToRecalcAts) }
          })
         
          const skuAtsOperations = await Promise.all(skuRecords.map(addErrorHandling(async (skuRecord) => {
              const skuAts = [];
              const skuOnlineAts = [];

              const inventoryRecords = await inventory.find({ skuId: skuRecord._id, availableToSell: { $gt: 0 } }).toArray()
              .catch(originalError => {
                  return { error: createError.bulkCalculateAvailableToSell.failedGetInventory(originalError, skuRecord) }
              })

              await Promise.all(inventoryRecords.map(addErrorHandling(async (inventoryRecord) => {
                  const storeData = await stores.findOne({ _id: inventoryRecord.storeId.toString().padStart(5, '0') })
                  .catch(originalError => {
                      return { error: createError.bulkCalculateAvailableToSell.failedGetStore(originalError, inventoryRecord) }
                  })
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
              })));
              styleAts.push({
                skuId: skuRecord._id,
                threshold: skuRecord.threshold,
                ats: skuAts
              })
              styleOnlineAts.push({
                skuId: skuRecord._id,
                threshold: skuRecord.threshold,
                ats: skuOnlineAts
              })
              
              return skus.updateOne({ _id: skuRecord._id }, { $set: { ats: skuAts, onlineAts: skuOnlineAts } })
              .catch(originalError => {
                  throw createError.bulkCalculateAvailableToSell.failedUpdateSkuAts(originalError, skuRecord);
              })
          })))
          const styleAtsOperations = await Promise.all([styles.updateOne({ _id: styleToRecalcAts._id }, { $set: { ats: styleAts, onlineAts: styleOnlineAts } })
                              .catch(originalError => {
                                  throw createError.bulkCalculateAvailableToSell.failedUpdateStyleAts(originalError, styleToRecalcAts);
                              })])
                              .catch(originalError => {
                                  return { error: createError.bulkCalculateAvailableToSell.failedAllAtsUpdates(originalError, stylesToRecalcAts) }
                              })
					styleAtsOperations[0].styleToRecalcAts = styleToRecalcAts._id;
					skuAtsOperations[0].styleToRecalcAts = styleToRecalcAts._id;
          return styleAtsOperations.concat(skuAtsOperations);
        }))
    )
    .then((results) => {
        const errors = results.filter((res) => res instanceof Error);
        const successes = results.filter((res) => !(res instanceof Error));
        const successResults = successes.map((result) => result.map((res) => res.styleToRecalcAts));
        const successfulStyleIds = successResults.map((result) => result.filter((res, index) => result.indexOf(res) === index)[0]);
        if (errors.length > 0) {
            const e = new Error(`${errors.length} of ${results.length} updates failed. See 'failedUpdatesErrors'.`);
            e.failedUpdatesErrors = errors;
            e.successfulUpdatesResults = results.filter((res) => !(res instanceof Error));

            if (successfulStyleIds.length > 0) {
              return bulkAtsRecalculateQueue.deleteMany({ _id: { $in: successfulStyleIds } })
              .then(() => { error: e })
              .catch(originalError => {
                  return { error: createError.bulkAtsRecalculateQueue.failedToRemoveFromQueue(originalError, successfulStyleIds) };
              })
            } else {
              return { error: e };
            }
        } else {
            return bulkAtsRecalculateQueue.deleteMany({ _id: { $in: successfulStyleIds } })
            .catch(originalError => {
                return { error: createError.bulkAtsRecalculateQueue.failedToRemoveFromQueue(originalError, successfulStyleIds) };
            })
        }
    })
    .catch(originalError => {
        return { error: createError.bulkCalculateAvailableToSell.failedAllUpdates(originalError, stylesToRecalcAts) }
    })
};

module.exports = global.main;
