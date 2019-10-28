const getCollection = require('../../lib/getCollection');

global.main = async function (params) {
    console.log(JSON.stringify({
        cfName: 'calculateAvailableToSell',
        params
    }));

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0]) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array");
    }

    const [inventory, styles, skus] = await Promise.all([
        getCollection(params),
        getCollection(params, params.stylesCollectionName),
        getCollection(params, params.skusCollectionName)
    ]);

    return Promise.all(params.messages
        .map(async (atsData) => {
          const skuAts = await inventory.aggregate([
                    {
                        $match: { styleId: id }
                    },
                    {
                        $group: {
                          _id: "$styleId",
                          total: { $sum: "$quantityOnHandSellable" },
                        }
                    }
                ]);
            }
        )
    ).then((results) => {
        console.log(results);
        const errors = results.filter((res) => res instanceof Error);
        if (errors.length > 0) {
            const e = new Error('Some updates failed. See `results`.');
            e.results = results;
            throw e;
        }
    });
};

module.exports = global.main;
