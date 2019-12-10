const { parseStyleMessage, filterStyleMessages } = require('../../lib/parseStyleMessage');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');

global.main = async function (params) {
    console.log(JSON.stringify({
        cfName: 'consumeCatalogMessage',
        params
    }));

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    let styles;
    let prices;
    try {
        styles = await getCollection(params);
        prices = await getCollection(params, params.pricesCollectionName);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    return Promise.all(params.messages
        .filter((msg) => msg.topic === params.topicName)
        .filter(filterStyleMessages)
        .map(parseStyleMessage)
        .map((styleData) => styles.findOne({ _id: styleData._id })
            .then((existingDocument) => (existingDocument && existingDocument.lastModifiedDate)
                ? styles.updateOne({ _id: styleData._id, lastModifiedDate: { $lte: styleData.lastModifiedDate } }, { $set: styleData })
                    .then((result) => result.modifiedCount > 0
                        ? prices.updateOne({ _id: styleData._id }, { $set: { _id: styleData._id, styleId: styleData._id, originalPrice: styleData.originalPrice, price: styleData.originalPrice } }, { upsert: true })
                        : null
                    )
                : styles.updateOne({ _id: styleData._id }, { $set: styleData }, { upsert: true }) // fix race condition of some kind that's happening
                    .then(() => prices.updateOne({ _id: styleData._id }, { $set:{ _id: styleData._id, styleId: styleData._id, originalPrice: styleData.originalPrice, price: styleData.originalPrice } }, { upsert: true }))
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
