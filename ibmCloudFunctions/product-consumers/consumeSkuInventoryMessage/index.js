const getCollection = require('../../lib/getCollection');
const { filterSkuInventoryMessage, parseSkuInventoryMessage } = require('../../lib/parseSkuInventoryMessage');

global.main = async function (params) {
    console.log({
        cfName: 'consumeSkuInventoryMessage',
        params
    });

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
        .map((inventoryData) => {
            const updateInventory = inventory.findOne({ _id: inventoryData._id })
                    .then((existingDocument) => existingDocument
                        ? inventory.updateOne({ _id: inventoryData._id }, { $set: inventoryData })
                        : inventory.insertOne(inventoryData)
                    );

            // sku ids can be null...
            const skuLookup = inventoryData.skuId
                ? skus.findOne({ _id: inventoryData.skuId })
                : null;

            return Promise.all([updateInventory, skuLookup])
                .then(async ([updateInventoryResult, sku]) => {
                    // Update style size count if we have a valid SKU
                    if (sku) {
                        const styleData = await styles.findOne({_id: sku.styleId})

                        if (styleData) {
                            const sizes = styleData.sizes || [];

                            const newSizes = (inventoryData.availableToSell && inventoryData.availableToSell > 0)
                                ? sizes.filter((v) => v !== `${sku.size}` && v !== `${sku.size}-${inventoryData.storeId}`).concat(`${sku.size}-${inventoryData.storeId}`)
                                : sizes.filter((v) => v !== `${sku.size}` && v !== `${sku.size}-${inventoryData.storeId}`);

                            const updateToProcess = { $set: { sizes: newSizes }, $setOnInsert: { effectiveDate: 0 } };

                            return styles.updateOne({ _id: inventoryData.styleId }, updateToProcess, { upsert: true })
                                .catch((err) => {
                                    console.error('Problem with document ' + inventoryData._id);
                                    console.error(err);
                                    if (!(err instanceof Error)) {
                                        const e = new Error();
                                        e.originalError = err;
                                        e.attemptedDocument = inventoryData;
                                        return e;
                                    }

                                    err.attemptedDocument = inventoryData;
                                    return err;
                                });
                        }
                    }
                })
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
    // TODO error handling - this MUST report errors and which offsets must be retried
};

module.exports = global.main;
