const { filterSkuMessage, parseSkuMessage } = require('../../lib/parseSkuMessage');
const { addErrorHandling, log, createLog, addLoggingToMain, passDown } = require('../utils');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');

const addToAlgoliaQueue = (styleAvailabilityCheckQueue, skuData) => styleAvailabilityCheckQueue.updateOne({ _id : skuData.styleId }, { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set : { _id: skuData.styleId, styleId: skuData.styleId } }, { upsert: true }).catch(originalError => {
		throw createError.consumeSkuMessage.failedSkuUpdate(originalError, skuData);
})

const main = async function (params) {
    log(createLog.params('consumeSkuMessage', params));

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    let skus;
    let styleAvailabilityCheckQueue;
    try {
        skus = await getCollection(params);
        styleAvailabilityCheckQueue = await getCollection(params, params.styleAvailabilityCheckQueue);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    return Promise.all(params.messages
        .map(addErrorHandling(msg => filterSkuMessage(msg) ? msg : null))
        .map(addErrorHandling(parseSkuMessage))
        .map(addErrorHandling(async (skuData) => {
                  const existingDocument = await skus.findOne({ _id: skuData._id })

                  const skuUpdate = { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set: skuData }
                  const operations = []
                  if (existingDocument && (existingDocument.lastModifiedDate <= skuData.lastModifiedDate || !existingDocument.lastModifiedDate)) {
                    operations.push(skus.updateOne({ _id: skuData._id }, skuUpdate ))
										if (!existingDocument.size || existingDocument.size.en !== skuData.size.en || existingDocument.size.fr !== skuData.size.fr) {
											operations.push(addToAlgoliaQueue(styleAvailabilityCheckQueue, skuData))
										}
                  } else {
                    operations.push(skus.updateOne({ _id: skuData._id }, skuUpdate, { upsert: true })
                                    .catch(originalError => {
                                        throw createError.consumeSkuMessage.failedSkuUpdate(originalError, skuData);
                                    }))
                  }
                  return Promise.all(operations)
                            .catch(originalError => {
                                return createError.consumeSkuMessage.failedAllUpdates(originalError, skuData);
                            })
            })
        )
    ).then(passDown({ messages: params.messages, includeProcessedMessages: true }))
    .catch(originalError => {
        throw createError.consumeCatalogMessage.failed(originalError, params);
    });
}

global.main = addLoggingToMain(main);
module.exports = global.main;
