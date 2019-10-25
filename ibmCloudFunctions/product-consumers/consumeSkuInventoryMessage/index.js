const getCollection = require('../../lib/getCollection');
const { filterSkuInventoryMessage, parseSkuInventoryMessage } = require('../../lib/parseSkuInventoryMessage');

global.main = async function (params) {
    console.log(JSON.stringify({
        cfName: 'consumeSkuInventoryMessage',
        params
    }));

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    const [inventory, styles, skus] = await Promise.all([
        getCollection(params),
        getCollection(params, params.stylesCollectionName),
        getCollection(params, params.skusCollectionName)
    ]);

    return Promise.all(params.messages
        .filter(filterSkuInventoryMessage)
        .map(parseSkuInventoryMessage)
        .map((inventoryData) => inventory.findOne({ _id: inventoryData._id })
                    .then(async (existingDocument) => {
                        await inventory.updateOne({ _id: inventoryData._id }, { $set: inventoryData }, { upsert: true })
                        return existingDocument.availableToSell || existingDocument.quantityOnHandSellable
                      })
                    .then(() => inventoryData._id)
                    .catch((err) => {
                        console.error('Problem with inventory ' + inventoryData._id);
                        console.error(err);
                        if (!(err instanceof Error)) {
                            const e = new Error();
                            e.originalError = err;
                            e.attemptedDocument = inventoryData;
                            return e;
                        }

                        err.attemptedDocument = inventoryData;
                        return err;
                    })
        )
    ).then((results) => {
        //console.log("results ", results);
        const errors = results.filter((res) => res instanceof Error);
        if (errors.length > 0) {
            const e = new Error('Some updates failed. See `results`.');
            e.results = results;
            throw e;
        } else {
          console.log("results ", results.map(async (inventoryData) => await inventory.findOne({ _id: inventoryData._id })).filter((inventoryData) => inventoryData));
          return results.map(async (inventoryData) => await inventory.findOne({ _id: inventoryData._id })).filter((inventoryData) => inventoryData);
        }
    });
};

module.exports = global.main;
