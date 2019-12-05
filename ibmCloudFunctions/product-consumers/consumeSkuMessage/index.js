const { filterSkuMessage, parseSkuMessage } = require('../../lib/parseSkuMessage');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');

global.main = async function (params) {
    console.log(JSON.stringify({
        cfName: 'consumeSkuMessage',
        params
    }));

    if (!params.topicName) {
        throw { error: new Error('Requires an Event Streams topic.') };
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw { error: new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field") };
    }

    let skus;
    try {
        skus = await getCollection(params);
    } catch (originalError) {
        throw { error: createError.failedDbConnection(originalError) };
    }

    return Promise.all(params.messages
        .filter(filterSkuMessage)
        .map(parseSkuMessage)
        .map((skuData) => skus.findOne({ _id: skuData._id })
            .then((existingDocument) => existingDocument
                ? skus.updateOne({ _id: skuData._id, lastModifiedDate: { $lt: skuData.lastModifiedDate } }, { $set: skuData })
                : skus.updateOne({ _id: skuData._id }, { $set: skuData }, { upsert: true }) // fix race condition
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
        )
    ).then((results) => {
        const errors = results.filter((res) => res instanceof Error);
        if (errors.length > 0) {
            const e = new Error(`${errors.length} of ${results.length} updates failed. See 'failedUpdatesErrors'.`);
            e.failedUpdatesErrors = errors;
            e.successfulUpdatesResults = results.filter((res) => !(res instanceof Error));
            throw { error: e };
        }
    });
}

module.exports = global.main;
