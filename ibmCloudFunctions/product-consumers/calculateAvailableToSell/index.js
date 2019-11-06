const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { addErrorHandling, log } = require('../utils');
const { handleStyleAtsUpdate, handleSkuAtsUpdate } = require('./utils');

global.main = async function (params) {
    const { messages, ...paramsExcludingMessages } = params;
    const messagesIsArray = Array.isArray(messages);
    console.log(JSON.stringify({
        cfName: 'calculateAvailableToSell',
        paramsExcludingMessages,
        messagesLength: messagesIsArray ? messages.length : null,
        messages // outputting messages as the last parameter because if it is too long the rest of the log will be truncated in logDNA
    }));

    if (!params.messages || !params.messages[0]) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array");
    }

    const [styles, skus, stores, styleAvailabilityCheckQueue] = await Promise.all([
        getCollection(params, params.stylesCollectionName),
        getCollection(params, params.skusCollectionName),
        getCollection(params, params.storesCollectionName),
        getCollection(params, params.styleAvailabilityCheckQueue)
    ]).catch(originalError => {
        throw createError.failedDbConnection(originalError);
    });

    return Promise.all(params.messages
        .map(addErrorHandling(async (atsData) => {
          const styleData = await styles.findOne({ _id: atsData.styleId });
          const skuData = await skus.findOne({ _id: atsData.skuId });
          const storeData = await stores.findOne({ _id: atsData.storeId.toString().padStart(5, '0') });

          if (!storeData || (styleData.departmentId === 27 && !storeData.canFulfillDep27) || storeData.isOutlet) return null;

          const styleAts = styleData.ats || [];
          const newStyleAts = handleStyleAtsUpdate(styleAts, atsData, skuData.threshold);
          const styleUpdateToProcess = { $set: { ats: newStyleAts } };

          const skuAts = skuData.ats || [];
          const newSkuAts = handleSkuAtsUpdate(skuAts, atsData);
          const skuUpdateToProcess = { $set: { ats: newSkuAts } };

          if (storeData.canOnlineFulfill) {
            const styleOnlineAts = styleData.onlineAts || [];
            const newStyleOnlineAts = handleStyleAtsUpdate(styleOnlineAts, atsData, skuData.threshold);
            styleUpdateToProcess['$set']['onlineAts'] = newStyleOnlineAts;

            const skuOnlineAts = skuData.onlineAts || [];
            const newSkuOnlineAts = handleSkuAtsUpdate(skuOnlineAts, atsData);
            skuUpdateToProcess['$set']['onlineAts'] = newSkuOnlineAts;
          }

          return Promise.all([styles.updateOne({ _id: atsData.styleId }, styleUpdateToProcess)
                              .catch(originalError => {
                                  return createError.calculateAvailableToSell.failedUpdateStyleAts(originalError, inventoryData);
                              }),
                              skus.updateOne({ _id: atsData.skuId }, skuUpdateToProcess)
                              .catch(originalError => {
                                  return createError.calculateAvailableToSell.failedUpdateSkuAts(originalError, inventoryData);
                              }),
                              styleAvailabilityCheckQueue.updateOne({ _id : atsData.styleId }, { $set : { _id: atsData.styleId, styleId: atsData.styleId } }, { upsert: true })
                              .catch(originalError => {
                                  return createError.calculateAvailableToSell.failedAddToAlgoliaQueue(originalError, inventoryData);
                              })])
                              .catch(err => {
                                  console.error('Problem with document ' + inventoryData._id);
                                  console.error(err);
                                  if (!(err instanceof Error)) {
                                      const e = new Error();
                                      e.originalError = err;
                                      e.attemptedDocument = inventoryData;
                                      return e;
                                  }

                                  err.attemptedDocument = inventoryData;
                                  return err;
                              });
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
