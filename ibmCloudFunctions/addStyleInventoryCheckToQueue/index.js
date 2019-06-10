const { filterSkuInventoryMessage, parseSkuInventoryMessage } = require('../lib/parseSkuInventoryMessage');
const getCollection = require('../lib/getCollection');

global.main = async function (params) {
    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    const styleAvailabilityCheckQueue = await getCollection(params);
    const stylesToCheck = [...new Set(params.messages
        .filter(filterSkuInventoryMessage)
        .map(parseSkuInventoryMessage)
        .map((skuInventoryData) => skuInventoryData.styleId)
    )];
    if (!stylesToCheck.length) {
        return;
    }
    return styleAvailabilityCheckQueue.bulkWrite(stylesToCheck
        .map((styleId) => {
            return {
                updateOne :
                {
                    "filter" : { _id : styleId },
                    "update" : { $set : { _id: styleId, styleId } },
                    "upsert": true
                }
            };
        }),
        { ordered : false }
    );
}

module.exports = global.main;
