const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { addErrorHandling, log, createLog, addLoggingToMain, passDownBatchedErrorsAndFailureIndexes } = require('../utils');
const { handleSkuAtsUpdate } = require('./utils');
const { filterSkuInventoryMessage, parseSkuInventoryMessage } = require('../../lib/parseSkuInventoryMessage');
const { groupByAttribute } = require('../../lib/utils');

const groupByInventoryId = groupByAttribute('id');

const main = async function (params) {
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

    const inventoryRecords = (params.messages
        .map(addErrorHandling(msg => filterSkuInventoryMessage(msg) ? msg : null))
        .map(addErrorHandling(parseSkuInventoryMessage)))
    const inventoryGroupedByInventoryId = groupByInventoryId(inventoryRecords);

    return Promise.all(inventoryGroupedByInventoryId
        .map(addErrorHandling(async (inventoryGroup) => {
          const atsData = inventoryGroup.reduce((finalInventoryRecord, inventoryRecord) => {
            if (!finalInventoryRecord || inventoryRecord.lastModifiedDate >= finalInventoryRecord.lastModifiedDate) {
              return inventoryRecord;
            } else {
              return finalInventoryRecord;
            }
          }, null)
          if (!atsData) return null;

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

          if (!storeData || !skuData || !styleData || storeData.isOutlet || !storeData.isVisible) return null;

          let atsUpdates = [];

          // Regular ats operations
          atsUpdates.push(await handleSkuAtsUpdate(atsData, skus, false))

          if ((storeData.canOnlineFulfill && styleData.departmentId !== "27") || (storeData.canFulfillDep27 && styleData.departmentId === "27")) {
              // Online ats operations
              atsUpdates.push(await handleSkuAtsUpdate(atsData, skus, true))
          }

          // Algolia ats operation
          atsUpdates.push(styleAvailabilityCheckQueue.updateOne({ _id : atsData.styleId }, { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set : { _id: atsData.styleId, styleId: atsData.styleId } }, { upsert: true })
                          .catch(originalError => {
                                throw createError.calculateAvailableToSell.failedAddToAlgoliaQueue(originalError, atsData);
                          }))

          atsUpdates = atsUpdates.filter((atsUpdate) => atsUpdate);
          return Promise.all(atsUpdates)
                            .catch(originalError => {
                                return createError.calculateAvailableToSell.failedAllUpdates(originalError, atsData);
                            })
        }))
    )
    .then(passDownBatchedErrorsAndFailureIndexes(inventoryGroupedByInventoryId, params.messages))
    .catch(originalError => {
        throw createError.calculateAvailableToSell.failed(originalError, paramsExcludingMessages);
    });
};

global.main = addLoggingToMain(main)

module.exports = global.main;
