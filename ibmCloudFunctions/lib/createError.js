const createError = (originalError, name, message) => {
    if (!originalError) {
        const error = new Error(message);
        error.name = name;
        error.code = error.name;
        return error;
    };

    const error = new Error(`${message} --- Caused by: ${originalError.message}`);
    error.name = `${name} --- Caused by: ${originalError.name || originalError.name}`;
    error.code = error.name; // https://github.com/nodejs/help/issues/789
    error.stack = originalError.stack;
    return error;
}

module.exports = {
    failedAlgoliaConnection: (originalError) => createError(
        originalError,
        'failed-algolia-connection',
        'Failed to connect to Algolia.'
    ),
    failedDbConnection: (originalError, collectionName) => createError(
        originalError,
        'failed-db-connection',
        `Failed to connect to db${collectionName ? ` for collection ${collectionName}` : ''}.`
    ),
    consumeInventoryMessage: {
        failed: (originalError, paramsExcludingMessages) => createError(
            originalError,
            'failed-consume-inventory-message',
            `Failure in run of consume inventory message; params excluding messages: ${paramsExcludingMessages}.`
        ),
        failedUpdateInventory: (originalError, inventoryData) => createError(
            originalError,
            'failed-inventory-update',
            `Failed to update inventory; inventory: ${inventoryData}.`
        ),
        failedUpdateStyle: (originalError, styleId) => createError(
            originalError,
            'failed-style-update',
            `Failed to update style; style Id: ${styleId}.`
        )
    },
    consumeDep27FulfillMessage: {
        failed: (originalError, paramsExcludingMessages) => createError(
            originalError,
            'failed-consume-dep27-message',
            `Failure in run of consume dep 27 message; params excluding messages: ${paramsExcludingMessages}.`
        ),
        failedUpdates: (originalError, storeId) => createError(
            originalError,
            'failed-consume-dep27-message-updates',
            `Failure to run all db updates for dep27; store id: ${storeId}`
        )
    },
    updateAlgoliaStyle: {
        failedRecords: (_, failed, total) => createError(
            null,
            'failed-prepare-styles-for-algolia',
            `Failed to prepare ${failed} of ${total} styles for Algolia.`
        ),
        failedRecord: (originalError) => createError(
            originalError,
            'failed-prepare-style-for-algolia',
            'Failed to prepare a style for Algolia'
        ),
    },
    consumeThresholdMessage: {
        failed: (originalError, paramsExcludingMessages) => createError(
            originalError,
            'failed-consume-threshold-message',
            `Failure in run of consume threshold message; params excluding messages: ${paramsExcludingMessages}.`
        ),
        failedUpdates: (originalError, thresholdData) => createError(
            originalError,
            'failed-updates',
            `Failed to run any queries on mongo for thresholds on sku, styles and algolia queue; threshold data: ${thresholdData}.`
        ),
        failedToGetSku: (originalError, thresholdData) => createError(
            originalError,
            'failed-get-sku-record',
            `Failed to get a sku record from mongo; threshold data: ${thresholdData}.`
        ),
        failedToGetStyle: (originalError, thresholdData) => createError(
            originalError,
            'failed-get-style-record',
            `Failed to get a style record from mongo; threshold data: ${thresholdData}.`
        ),
        failedToUpdateStyleThreshold: (originalError, styleData) => createError(
            originalError,
            'failed-to-update-style-threshold',
            `Failed to update the thresholds on a style; style data: ${styleData}.`
        ),
        failedToUpdateSkuThreshold: (originalError, thesholdData) => createError(
            originalError,
            'failed-to-update-sku-threshold',
            `Failed to update the thresholds on a sku; threshold data: ${thresholdData}.`
        ),
        failedAddToAlgoliaQueue: (originalError, styleData) => createError(
            originalError,
            'failed-to-add-to-algolia-queue',
            `Failed to add style inventory update to algolia mongo queue; style data: ${styleData}.`
        )
    },
    consumeStoresMessage: {
        failed: (originalError, paramsExcludingMessages) => createError(
            originalError,
            'failed-consume-stores-message',
            `Failure in run of consume stores message; params excluding messages: ${paramsExcludingMessages}.`
        ),
        failedToUpdateStore: (originalError, storeId) => createError(
            originalError,
            'failed-to-update-store',
            `Failed to update store record; store id: ${storeId}.`
        )
    },
    consumeStoresFulfillMessage: {
        failed: (originalError, paramsExcludingMessages) => createError(
            originalError,
            'failed-consume-stores-fulfill-message',
            `Failure in run of consume stores fulfill message; params excluding messages: ${paramsExcludingMessages}.`
        ),
        failedToUpdateStore: (originalError, storeId) => createError(
            originalError,
            'failed-store-update',
            `Failed to update store; store Id: ${storeId}.`
        )
    }
}
