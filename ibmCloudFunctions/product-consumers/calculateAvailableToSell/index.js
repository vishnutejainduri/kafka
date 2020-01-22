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
        return { result: "No valid inventory messages sent to process" }
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

          let atsUpdates = [];

          // Regular ats operations
          atsUpdates = await handleStyleAtsUpdate(atsData, styles, atsUpdates, false);
          atsUpdates = await handleSkuAtsUpdate(atsData, skus, atsUpdates, false);

          if ((storeData.canOnlineFulfill && styleData.departmentId !== "27") || (storeData.canFulfillDep27 && styleData.departmentId === "27")) {
              // Online ats operations
              atsUpdates = await handleStyleAtsUpdate(atsData, styles, atsUpdates, true);
              atsUpdates = await handleSkuAtsUpdate(atsData, skus, atsUpdates, true);
          }

          // Algolia ats operation
          atsUpdates.push(styleAvailabilityCheckQueue.updateOne({ _id : atsData.styleId }, { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set : { _id: atsData.styleId, styleId: atsData.styleId } }, { upsert: true })
                          .catch(originalError => {
                                throw createError.calculateAvailableToSell.failedAddToAlgoliaQueue(originalError, atsData);
                          }))
          return Promise.all(atsUpdates)
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
