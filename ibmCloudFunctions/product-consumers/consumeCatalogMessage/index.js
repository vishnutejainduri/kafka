const { parseStyleMessage, filterStyleMessages } = require('../../lib/parseStyleMessage');
const { addErrorHandling, log, createLog } = require('../utils');
const createError = require('../../lib/createError');
const getCollection = require('../../lib/getCollection');
const messagesLogs = require('../../lib/messagesLogs');

const main = async function (params) {
    log(createLog.params('consumeCatalogMessage', params));

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    let styles;
    let prices;
    let bulkAtsRecalculateQueue;
    try {
        styles = await getCollection(params);
        prices = await getCollection(params, params.pricesCollectionName);
        bulkAtsRecalculateQueue = await getCollection(params, params.bulkAtsRecalculateQueue);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    return Promise.all(params.messages
        .filter(addErrorHandling((msg) => msg.topic === params.topicName))
        .filter(addErrorHandling(filterStyleMessages))
        .map(addErrorHandling(parseStyleMessage))
        .map(addErrorHandling((styleData) => styles.findOne({ _id: styleData._id })
            .then((existingDocument) => (existingDocument && existingDocument.lastModifiedDate)
                ? styles.updateOne({ _id: styleData._id, lastModifiedDate: { $lte: styleData.lastModifiedDate } }, { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set: styleData })
                    .then((result) => result.modifiedCount > 0
                        ? prices.updateOne({ _id: styleData._id }, { $currentDate: { lastModifiedInternalOriginalPrice: { $type:"timestamp" } }, $set: { _id: styleData._id, styleId: styleData._id, originalPrice: styleData.originalPrice } }, { upsert: true })
                          .then(() => {
                            if (existingDocument.departmentId && existingDocument.departmentId !== styleData.departmentId && (styleData.departmentId === '27' || existingDocument.departmentId === '27')) {
                              bulkAtsRecalculateQueue.insertOne({ _id: styleData._id, insertTimestamp: styleData.effectiveDate })
                              .catch(originalError => {
                                  throw createError.consumeCatalogMessage.failedBulkAtsInsert(originalError, styleData);
                              })
                            }
                          })
                          .catch(originalError => {
                              throw createError.consumeCatalogMessage.failedPriceUpdates(originalError, styleData);
                          })
                        : null
                    )
                    .catch(originalError => {
                        throw createError.consumeCatalogMessage.failedStyleUpdates(originalError, styleData);
                    })
                  : styles.updateOne({ _id: styleData._id }, { $set: styleData }, { upsert: true })
                    .then(() => prices.updateOne({ _id: styleData._id }, { $currentDate: { lastModifiedInternalOriginalPrice: { $type:"timestamp" } }, $set: { _id: styleData._id, styleId: styleData._id, originalPrice: styleData.originalPrice } }, { upsert: true })
                                .catch(originalError => {
                                    throw createError.consumeCatalogMessage.failedPriceUpdates(originalError, styleData);
                                })
                    )
                    .catch(originalError => {
                        throw createError.consumeCatalogMessage.failedStyleUpdates(originalError, styleData);
                    })
            ).then(() => console.log('Updated/inserted document ' + styleData._id))
            .catch((err) => {
                console.error('Problem with document ' + styleData._id);
                console.error(err);
                if (!(err instanceof Error)) {
                    const e = new Error();
                    e.originalError = err;
                    e.attemptedDocument = styleData;
                    return e;
                }

                err.attemptedDocument = styleData;
                return err;
            })
        ))
    ).then((results) => {
        const errors = results.filter((res) => res instanceof Error);
        if (errors.length > 0) {
            const e = new Error(`${errors.length} of ${results.length} updates failed. See 'failedUpdatesErrors'.`);
            e.failedUpdatesErrors = errors;
            e.successfulUpdatesResults = results.filter((res) => !(res instanceof Error));
            throw e;
        }
    })
    .catch(originalError => {
        throw createError.consumeCatalogMessage.failed(originalError, params);
    });
}

global.main = async function (params) {
  return Promise.all([
      main(params),
      messagesLogs.storeBatch(params)
  ]).then(([result]) => result);
}

module.exports = global.main;
