const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { addErrorHandling, log } = require('../utils');

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
          //const storeData = await stores.findOne({ _id: "00025" });
          const storeId = atsData.storeId.toString().padStart(5, '0');
          console.log('store id', storeId);
          const storeData = await stores.findOne({ _id: storeId });

          console.log(storeData);

          if (styleData.departmentId === 27 && !storeData.canFulfillDep27) return null;
          if (storeData.isOutlet) return null;

          const ats = styleData.ats || [];

          const newAts = (atsData.availableToSell && atsData.availableToSell > 0)
              ? ats.filter((atsRecord) => atsRecord.skuId !== atsData.skuId && atsRecord.storeId !== atsData.storeId)
                .concat({
                  skuId: atsRecord.skuId,
                  storeId: atsRecord.storeId,
                  availableToSell: atsRecord.availableToSell,
                  threshold: skuData.threshold
                })
              : ats.filter((atsRecord) => atsRecord.skuId !== atsData.skuId && atsRecord.storeId !== atsData.storeId);

          const updateToProcess = { $set: { ats: newAts } };

          if (storeData.canOnlineFulfill) {
            const onlineAts = styleData.onlineAts || [];
            const newOnlineAts = (atsData.availableToSell && atsData.availableToSell > 0)
                ? onlineAts.filter((atsRecord) => atsRecord.skuId !== atsData.skuId && atsRecord.storeId !== atsData.storeId)
                  .concat({
                    skuId: atsRecord.skuId,
                    storeId: atsRecord.storeId,
                    availableToSell: atsRecord.availableToSell,
                    threshold: skuData.threshold
                  })
                : onlineAts.filter((atsRecord) => atsRecord.skuId !== atsData.skuId && atsRecord.storeId !== atsData.storeId);
            updateToProcess['$set']['onlineAts'] = newOnlineAts;
          }
          console.log(updateToProcess); 

          return styles.updateOne({ _id: styleId }, updateToProcess)
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
