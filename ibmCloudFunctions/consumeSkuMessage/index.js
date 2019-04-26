const parseSkuMessage = require('../lib/parseSkuMessage');
const getCollection = require('../lib/getCollection');

async function main(params) {
    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }


    const skus = await getCollection(params);
    return Promise.all(params.messages
        .filter((msg) => msg.topic === params.topicName)
        .map((msg) => parseSkuMessage(msg))
        // TODO MUST FILTER BY ORG!!!
        .map((skuData) => skus.findOne({ _id: skuData._id })
            .then((existingDocument) => existingDocument
                ? skus.updateOne({ _id: skuData._id, lastModifiedDate: { $lt: skuData.lastModifiedDate } }, { $set: skuData })
                : skus.insertOne(skuData)
            ).then(() => "Updated/inserted document " + skuData._id)
        )
    ).then((results) => { results });
    // TODO error handling - this MUST report errors and which offsets must be retried
}

exports.main = main;
