const getCollection = require('../../lib/getCollection');
const { filterSkuInventoryMessage, parseSkuInventoryMessage } = require('../../lib/parseSkuInventoryMessage');

global.main = async function (params) {
    console.log(JSON.stringify({
        cfName: 'calculateAvailableToSell',
        params
    }));

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    const [inventory, styles, skus, stores] = await Promise.all([
        getCollection(params),
        getCollection(params, params.stylesCollectionName),
        getCollection(params, params.skusCollectionName),
        getCollection(params, params.storesCollectionName)
    ]);

    return Promise.all(params.messages
        .filter(filterSkuInventoryMessage)
        .map(parseSkuInventoryMessage)
        .map(async (inventoryData) => {
               
            }
        )
    ).then((results) => {
        const errors = results.filter((res) => res instanceof Error);
        if (errors.length > 0) {
            const e = new Error('Some updates failed. See `results`.');
            e.results = results;
            throw e;
        }
    });
};

module.exports = global.main;
