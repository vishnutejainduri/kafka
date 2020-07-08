const { filterSkuMessage, parseSkuMessage } = require('../../lib/parseSkuMessage');
const { addErrorHandling, log, createLog, addLoggingToMain } = require('../utils');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');

const main = async function (params) {
    log(createLog.params('consumeSkuMessage', params));

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    let skus;
    try {
        skus = await getCollection(params);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    return Promise.all(params.messages
        .map(addErrorHandling(msg => filterSkuMessage(msg) ? msg : null))
        .map(addErrorHandling(parseSkuMessage))
        .map(addErrorHandling(async (skuData) => {
                  const existingDocument = await skus.findOne({ _id: skuData._id })

                  const skuUpdate = { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set: skuData }
                  if (existingDocument && existingDocument.lastModifiedDate) {
                    return skus.updateOne({ _id: skuData._id, lastModifiedDate: { $lt: skuData.lastModifiedDate } }, skuUpdate)
                                    .catch(originalError => {
                                        throw createError.consumeSkuMessage.failedSkuUpdate(originalError, skuData);
                                    })
                  } else {
                    return skus.updateOne({ _id: skuData._id }, skuUpdate, { upsert: true })
                                    .catch(originalError => {
                                        throw createError.consumeSkuMessage.failedSkuUpdate(originalError, skuData);
                                    })
                  }
            })
        )
    ).then((results) => {
        const errors = results.filter((res) => res instanceof Error);
        if (errors.length > 0) {
            const e = new Error(`${errors.length} of ${results.length} updates failed. See 'failedUpdatesErrors'.`);
            e.failedUpdatesErrors = errors;
            e.successfulUpdatesResults = results.filter((res) => !(res instanceof Error));
            throw e;
        }
    });
}

global.main = addLoggingToMain(main);
module.exports = global.main;
