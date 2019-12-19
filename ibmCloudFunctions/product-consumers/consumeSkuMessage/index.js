const { filterSkuMessage, parseSkuMessage } = require('../../lib/parseSkuMessage');
const { addErrorHandling, log, createLog } = require('../utils');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');

global.main = async function (params) {
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
        .filter(filterSkuMessage)
        .map(parseSkuMessage)
        .map(addErrorHandling((skuData) => skus.findOne({ _id: skuData._id })
            .then((existingDocument) => (existingDocument && existingDocument.lastModifiedDate)
                  ? skus.updateOne({ _id: skuData._id, lastModifiedDate: { $lt: skuData.lastModifiedDate } }, { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set: skuData })
                  : skus.updateOne({ _id: skuData._id }, { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set: skuData }, { upsert: true }) // fix race condition
            ).then(() => "Updated/inserted document " + skuData._id)
            .catch((err) => {
                console.error('Problem with SKU ' + skuData._id);
                console.error(err);
                if (!(err instanceof Error)) {
                    const e = new Error();
                    e.originalError = err;
                    e.attemptedDocument = skuData;
                    return e;
                }

                err.attemptedDocument = skuData;
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
    });
}

module.exports = global.main;
