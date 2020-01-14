const createError = require('../../lib/createError');

const handleStyleUpdate = (
    skus,
    styles,
    {
        skuId,
        storeId,
        availableToSell,
        styleId
    }
) => skus
    .findOne({ _id: skuId })
    .then(sku => {
        if (!sku) {
            return null;
        }

        return styles.findOne({_id: sku.styleId})
                .then(styleData => {
                    if (!styleData) {
                        return null;
                    }

                    if (styleData) {
                        const sizes = styleData.sizes || [];
                        const storeInventory = styleData.storeInventory || {};

                        const newSizes = availableToSell
                            ? sizes.filter((size) => size !== `${sku.size}` && size !== `${sku.size}-${storeId}`).concat(`${sku.size}`)
                            : sizes.filter((size) => size !== `${sku.size}` && size !== `${sku.size}-${storeId}`);

                        const storeInventorySizes = storeInventory[storeId] || [];
                        const newStoreInventorySizes = availableToSell
                            ? storeInventorySizes.filter((size) => size !== sku.size).concat(sku.size)
                            : storeInventorySizes.filter((size) => size !== sku.size)

                        storeInventory[storeId] = newStoreInventorySizes;

                        const updateToProcess = { $set: { sizes: newSizes, storeInventory: storeInventory }, $setOnInsert: { effectiveDate: 0 } };

                        return styles.updateOne({ _id: styleId }, updateToProcess, { upsert: true })
                    }
                });
            }
    )
    .catch(originalError => {
        return createError.consumeInventoryMessage.failedUpdateStyle(originalError, styleId);
    });

module.exports = {
    handleStyleUpdate
};
