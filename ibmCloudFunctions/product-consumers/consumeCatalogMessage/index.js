const { parseStyleMessage, filterStyleMessages } = require('../../lib/parseStyleMessage');
const { addErrorHandling, log, createLog } = require('../utils');
const createError = require('../../lib/createError');
const getCollection = require('../../lib/getCollection');

global.main = async function (params) {
    log(createLog.params('consumeCatalogMessage', params));

    if (!params.topicName) {
        return { error: new Error('Requires an Event Streams topic.') };
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        return { error: new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field") }
    }

    const styles = await getCollection(params)
      .catch(originalError => {
          return { error: createError.failedDbConnection(originalError) };
      });
    const prices = await getCollection(params, params.pricesCollectionName)
      .catch(originalError => {
          return { error: createError.failedDbConnection(originalError) };
      });
    const bulkAtsRecalculateQueue = await getCollection(params, params.bulkAtsRecalculateQueue)
      .catch(originalError => {
          return { error: createError.failedDbConnection(originalError) };
      });
    return Promise.all(params.messages
        .filter(addErrorHandling((msg) => msg.topic === params.topicName))
        .filter(addErrorHandling(filterStyleMessages))
        .map(addErrorHandling(parseStyleMessage))
        .map(addErrorHandling((styleData) => styles.findOne({ _id: styleData._id })
            .then((existingDocument) => (existingDocument && existingDocument.effectiveDate)
                  ? styles.updateOne({ _id: styleData._id, effectiveDate: { $lte: styleData.effectiveDate } }, { $set: styleData })
                    .then((result) => result.modifiedCount > 0
                        ? prices.updateOne({ _id: styleData._id }, { $set: { _id: styleData._id, styleId: styleData._id, originalPrice: styleData.originalPrice, price: styleData.originalPrice } }, { upsert: true })
                          .then(() => {
                            if (existingDocument.departmentId && existingDocument.departmentId !== styleData.departmentId) {
                              bulkAtsRecalculateQueue.insertOne({ _id: styleData._id, insertTimestamp: styleData.effectiveDate })
                              .catch(originalError => {
                                  return { error: createError.consumeCatalogMessage.failedBulkAtsInsert(originalError, styleData) };
                              })
                            }
                          })
                          .catch(originalError => {
                              return { error: createError.consumeCatalogMessage.failedPriceUpdates(originalError, styleData) };
                          })
                        : null
                    )
                    .catch(originalError => {
                        return { error: createError.consumeCatalogMessage.failedStyleUpdates(originalError, styleData) };
                    })
                  : styles.updateOne({ _id: styleData._id }, { $set: styleData }, { upsert: true })
                    .then(() => prices.updateOne({ _id: styleData._id }, { $set:{ _id: styleData._id, styleId: styleData._id, originalPrice: styleData.originalPrice, price: styleData.originalPrice } }, { upsert: true })
                                .catch(originalError => {
                                    return { error: createError.consumeCatalogMessage.failedPriceUpdates(originalError, styleData) };
                                })
                    )
                    .catch(originalError => {
                        return { error: createError.consumeCatalogMessage.failedStyleUpdates(originalError, styleData) };
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
            return { error: e };
        }
    })
    .catch(originalError => {
        return { error: createError.consumeCatalogMessage.failed(originalError, params) };
    });
}

module.exports = global.main;
