const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { addErrorHandling, log, createLog } = require('../utils');
const { handleStyleAtsUpdate, handleSkuAtsUpdate } = require('./utils');

global.main = async function (params) {
    log(createLog.params('calculateAvailableToSell', params));
    // messages is not used, but paramsExcludingMessages is used
    // eslint-disable-next-line no-unused-vars
    const { messages, ...paramsExcludingMessages } = params;

    if (!params.messages || !params.messages[0]) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array");
    }

    let styles;
    let skus;
    let stores;
    let styleAvailabilityCheckQueue;
    try {
        styles = await getCollection(params, params.stylesCollectionName);
        skus = await getCollection(params, params.skusCollectionName);
        stores = await getCollection(params, params.storesCollectionName);
        styleAvailabilityCheckQueue = await getCollection(params, params.styleAvailabilityCheckQueue);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    return Promise.all(params.messages
        .map(addErrorHandling(async (atsData) => {
          const styleData = await styles.findOne({ _id: atsData.styleId })
                              .catch(originalError => {
                                  return createError.calculateAvailableToSell.failedGetStyle(originalError, atsData);
                              });
          const skuData = await skus.findOne({ _id: atsData.skuId })
                              .catch(originalError => {
                                  return createError.calculateAvailableToSell.failedGetSku(originalError, atsData);
                              });
          const storeData = await stores.findOne({ _id: atsData.storeId.toString().padStart(5, '0') })
                              .catch(originalError => {
                                  return createError.calculateAvailableToSell.failedGetStore(originalError, atsData);
                              });

          if (!storeData || !skuData || !styleData || storeData.isOutlet) return null;

          const styleAts = styleData.ats || [];
          //const newStyleAts = handleStyleAtsUpdate(styleAts, atsData, skuData.threshold);
          const styleUpdateToProcess = { $set: { ats: newStyleAts } };

          const skuAts = skuData.ats || [];
          const newSkuAts = handleSkuAtsUpdate(skuAts, atsData);
          const skuUpdateToProcess = { $set: { ats: newSkuAts } };

        if ((storeData.canOnlineFulfill && styleData.departmentId !== "27") || (storeData.canFulfillDep27 && styleData.departmentId === "27")) {
            const styleOnlineAts = styleData.onlineAts || [];
            const newStyleOnlineAts = handleStyleAtsUpdate(styleOnlineAts, atsData, skuData.threshold);
            styleUpdateToProcess['$set']['onlineAts'] = newStyleOnlineAts;

            const skuOnlineAts = skuData.onlineAts || [];
            const newSkuOnlineAts = handleSkuAtsUpdate(skuOnlineAts, atsData);
            skuUpdateToProcess['$set']['onlineAts'] = newSkuOnlineAts;
          }

          styleUpdateToProcess['$currentDate'] = { lastModifiedInternalAts: { $type:"timestamp" } };
          skuUpdateToProcess['$currentDate'] = { lastModifiedInternalAts: { $type:"timestamp" } };
          return Promise.all([styles.updateOne({ _id: atsData.styleId }, styleUpdateToProcess)
                              .catch(originalError => {
                                  throw createError.calculateAvailableToSell.failedUpdateStyleAts(originalError, atsData);
                              }),
                              skus.updateOne({ _id: atsData.skuId }, skuUpdateToProcess)
                              .catch(originalError => {
                                  throw createError.calculateAvailableToSell.failedUpdateSkuAts(originalError, atsData);
                              }),
                              styleAvailabilityCheckQueue.updateOne({ _id : atsData.styleId }, { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set : { _id: atsData.styleId, styleId: atsData.styleId } }, { upsert: true })
                              .catch(originalError => {
                                  throw createError.calculateAvailableToSell.failedAddToAlgoliaQueue(originalError, atsData);
                              })])
                              .catch(originalError => {
                                  return createError.calculateAvailableToSell.failedAllUpdates(originalError, atsData);
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
        throw createError.calculateAvailableToSell.failed(originalError, paramsExcludingMessages);
    });
};

module.exports = global.main;
