const { filterSkuMessage, parseSkuMessage } = require('../../lib/parseSkuMessage');
const { addErrorHandling, log, createLog } = require('../utils');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { handleSkuAtsSizeUpdate } = require('./utils');

global.main = async function (params) {
    log(createLog.params('consumeSkuMessage', params));

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    let skus;
    let styles;
    try {
        skus = await getCollection(params);
        styles = await getCollection(params, params.stylesCollectionName);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    return Promise.all(params.messages
        .filter(addErrorHandling(filterSkuMessage))
        .map(addErrorHandling(parseSkuMessage))
        .map(addErrorHandling(async (skuData) => {
                  const skuOperatons = [];
                  const existingDocument = await skus.findOne({ _id: skuData._id })

                  if (existingDocument && existingDocument.lastModifiedDate) {
                    skuOperatons.push(skus.updateOne({ _id: skuData._id, lastModifiedDate: { $lt: skuData.lastModifiedDate } }, { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set: skuData }).catch(originalError => {
                                        return createError.consumeSkuMessage.failedSkuUpdate(originalError, skuData);
                                    })
                    )
                  } else {
                    skuOperatons.push(skus.updateOne({ _id: skuData._id }, { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set: skuData }, { upsert: true }).catch(originalError => {
                                        return createError.consumeSkuMessage.failedSkuUpdate(originalError, skuData);
                                    })
                    )
                  }

                  skuOperatons.push(await handleSkuAtsSizeUpdate (skuData, styles, false));
                  skuOperatons.push(await handleSkuAtsSizeUpdate (skuData, styles, true));

                  return Promise.all(skuOperatons)
                                    .catch(originalError => {
                                        return createError.consumeSkuMessage.failedAllUpdates(originalError, skuData);
                                    })
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

module.exports = global.main;
