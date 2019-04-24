const parseSkuMessage = require('../lib/parseSkuMessage');
const getDatabaseUpdateFunction = require('../lib/getDatabaseUpdateFunction');

async function main(params) {
    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    const updateSkus = await getDatabaseUpdateFunction(params);
    const promise = Promise.resolve();
    params.messages
        .filter((msg) => msg.topic === params.topicName)
        .map((msg) => parseSkuMessage(msg))
        // TODO MUST FILTER BY ORG!!!
        .forEach((skuData) => {
            // perform updates serially to avoid opening too many connections
            promise.then(() => updateSkus({ id: skuData.id }, skuData));
            // TODO error handling - this MUST report errors and which offsets must be retried
        });

    return promise;
}

exports.main = main;
