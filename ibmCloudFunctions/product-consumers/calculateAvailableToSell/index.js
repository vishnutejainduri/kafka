const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { addErrorHandling, log } = require('../utils');
const { handleAtsUpdate } = require('./utils');

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

    const [styles, skus, stores] = await Promise.all([
        getCollection(params, params.stylesCollectionName),
        getCollection(params, params.skusCollectionName),
        getCollection(params, params.storesCollectionName)
    ]).catch(originalError => {
        throw createError.failedDbConnection(originalError);
    });

    return Promise.all(params.messages
        .map(addErrorHandling(async (atsData) => {
          const styleData = await styles.findOne({ _id: atsData.styleId });
          const skuData = await skus.findOne({ _id: atsData.skuId });
          const storeData = await stores.findOne({ _id: atsData.storeId.toString().padStart(5, '0') });

          if (!storeData || (styleData.departmentId === 27 && !storeData.canFulfillDep27) || storeData.isOutlet) return null;

          const ats = styleData.ats || [];
          const newAts = handleAtsUpdate(ats, atsData, skuData.threshold);
          const updateToProcess = { $set: { ats: newAts } };

          if (storeData.canOnlineFulfill) {
            const onlineAts = styleData.onlineAts || [];
            const newOnlineAts = handleAtsUpdate(onlineAts, atsData, skuData.threshold);
            updateToProcess['$set']['onlineAts'] = newOnlineAts;
          }
          console.log(JSON.stringify(updateToProcess));

          return await styles.updateOne({ _id: atsData.styleId }, updateToProcess)
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
        throw createError.consumeInventoryMessage.failed(originalError, paramsExcludingMessages);
    });
};

module.exports = global.main;
