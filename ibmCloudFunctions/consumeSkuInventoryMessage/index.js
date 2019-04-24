const getDatabaseUpdateFunction = require('../lib/getDatabaseUpdateFunction');
const parseSkuInventoryMessage = require('../lib/parseSkuInventoryMessage');

async function main(params) {
    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    const updateInventory = getDatabaseUpdateFunction(params);
    const promise = Promise.resolve();
    params.messages
        .filter((msg) => msg.topic === params.topicName)
        .map((msg) => parseSkuInventoryMessage(msg))
        .forEach((inventoryData) => {
            // perform updates serially to avoid opening too many connections
            promise.then(() => {
                return updateInventory(
                    {
                        styleId: inventoryData.styleId,
                        skuId: inventoryData.skuId
                    },
                    inventoryData
                );
            });
            // TODO error handling - this MUST report errors and which offsets must be retried
        });

    return promise;
}

exports.main = main;
