const { parseThresholdMessage } = require('../../lib/parseThresholdMessage');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { addErrorHandling, log } = require('../utils');

global.main = async function (params) {
    console.log(JSON.stringify({
        cfName: 'consumeThresholdMessage',
        params
    }));

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    const [skus, styles, styleAvailabilityCheckQueue] = await Promise.all([
        getCollection(params),
        getCollection(params, params.stylesCollectionName),
        getCollection(params, params.styleAvailabilityCheckQueue)
    ]).catch(originalError => {
        throw createError.failedDbConnection(originalError);
    });

    return Promise.all(params.messages
        .map(addErrorHandling(parseThresholdMessage))
        .map(addErrorHandling(async (thresholdData) => { 
              const skuData = await skus.findOne({ _id: thresholdData.skuId })
                .catch(originalError => {
                    return createError.consumeThresholdMessage.failedToGetSku(originalError, thresholdData);
                });
              const styleData = await styles.findOne({ _id: skuData.styleId })
                .catch(originalError => {
                    return createError.consumeThresholdMessage.failedToGetStyle(originalError, thresholdData);
                });

              const newAts = styleData.ats.map((atsRecord) => {
                if (atsRecord.skuId === thresholdData.skuId) {
                  atsRecord.threshold = thresholdData.threshold
                }
                return atsRecord;
              });
              const newOnlineAts = styleData.onlineAts.map((atsRecord) => {
                if (atsRecord.skuId === thresholdData.skuId) {
                  atsRecord.threshold = thresholdData.threshold
                }
                return atsRecord;
              });
              
              return Promise.all([styles.updateOne({ _id: styleData._id }, { $set: { ats: newAts, onlineAts: newOnlineAts } })
                                  .catch(originalError => {
                                      return createError.consumeThresholdMessage.failedToUpdateStyleThreshold(originalError, styleData);
                                  }),
                                  skus.updateOne({ _id: thresholdData.skuId }, { $set: { threshold: thresholdData.threshold } })
                                  .catch(originalError => {
                                      return createError.consumeThresholdMessage.failedToUpdateSkuThreshold(originalError, thresholdData);
                                  }),
                                  styleAvailabilityCheckQueue.updateOne({ _id : styleData._id }, { $set : { _id: styleData._id, styleId: styleData._id } }, { upsert: true })
                                  .catch(originalError => {
                                      return createError.consumeThresholdMessage.failedAddToAlgoliaQueue(originalError, styleData);
                                  })])
                                  .catch((err) => {
                                      console.error('Problem with threshold data ' + thresholdData);
                                      console.error(err);
                                      if (!(err instanceof Error)) {
                                          const e = new Error();
                                          e.originalError = err;
                                          e.attemptedDocument = thresholdData;
                                          return e;
                                      }

                                      err.attemptedDocument = thresholdData;
                                      return err;
                                  })
            })
        )
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
        throw createError.consumeThresholdMessage.failed(originalError, paramsExcludingMessages);
    });
}

module.exports = global.main;
