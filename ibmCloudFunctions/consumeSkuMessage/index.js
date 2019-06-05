const { filterSkuMessage, parseSkuMessage } = require('../lib/parseSkuMessage');
const getCollection = require('../lib/getCollection');

global.main = async function (params) {
    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }


    const skus = await getCollection(params);
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
            const e = new Error('Some updates failed. See `results`.');
            e.results = results;
            throw e;
        }
    });
}

module.exports = global.main;
