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

                        // TODO: can remove ${storeId} when this no longer exists in production
                        const newSizes = availableToSell 
                            ? sizes.filter((v) => v !== `${sku.size}` && v !== `${sku.size}-${storeId}`).concat(`${sku.size}-${storeId}`)
                            : sizes.filter((v) => v !== `${sku.size}` && v !== `${sku.size}-${storeId}`);

                        const updateToProcess = { $set: { sizes: newSizes }, $setOnInsert: { effectiveDate: 0 } };

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
