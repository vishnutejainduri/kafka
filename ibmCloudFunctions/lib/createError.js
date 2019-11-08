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
    updateAlgoliaInventory: {
        failedToGetApiResponse: (originalError, styleId) => createError(
            originalError,
            'failed-to-get-api-response',
            `Failed to get api response; style Id: ${styleId}.`
        )
    },
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
        ),
        failedUpdates: (originalError, inventoryData) => createError(
            originalError,
            'failed-updates',
            `Failed to run inventory updates on style and inventory; inventory data: ${inventoryData}.`
        )
    },
    calculateAvailableToSell: {
        failed: (originalError, paramsExcludingMessages) => createError(
            originalError,
            'failed-calculate-available-to-sell',
            `Failure in run of calculate available to sell; params excluding messages: ${paramsExcludingMessages}.`
        ),
        failedUpdateStyleAts: (originalError, atsData) => createError(
            originalError,
            'failed-style-ats-update',
            `Failed to update style ats; inventory: ${atsData}.`
        ),
        failedUpdateSkuAts: (originalError, atsData) => createError(
            originalError,
            'failed-sku-ats-update',
            `Failed to update sku ats; inventory: ${atsData}.`
        ),
        failedAddToAlgoliaQueue: (originalError, atsData) => createError(
            originalError,
            'failed-add-to-algolia-queue',
            `Failed to add style for inventory update to algolia mongo queue; inventory: ${atsData}.`
        ),
        failedGetStyle: (originalError, atsData) => createError(
            originalError,
            'failed-get-style',
            `Failed to get style for ats update; inventory: ${atsData}.`
        ),
        failedGetSku: (originalError, atsData) => createError(
            originalError,
            'failed-get-sku',
            `Failed to get sku for ats update; inventory: ${atsData}.`
        ),
        failedGetStore: (originalError, atsData) => createError(
            originalError,
            'failed-get-store',
            `Failed to get store for ats update; inventory: ${atsData}.`
        ),
        failedAllUpdates: (originalError, atsData) => createError(
            originalError,
            'failed-all-updates',
            `Failed to run all ats queries; inventory: ${atsData}.`
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
    updateAlgoliaInventory: {
        failedRecord: (originalError) => createError(
            originalError,
            'failed-record',
            'Failed to update algolia ats'
        ),
        failedToRemoveFromQueue: (originalError, styleIds) => createError(
            originalError,
            'failed-to-remove-from-queue',
            `Failed to remove from algolia mongo queue the following style ids: ${styleIds}`
        ),
        failedToGetRecords: (originalError) => createError(
            originalError,
            'failed-to-get-records-from-algolia-mongo-queue',
            'Failed to get any records from the algolia mongo queue'
        ),
        failedToGetStyle: (originalError, style) => createError(
            originalError,
            'failed-to-get-style-from-mongo',
            `Failed to get relevant algolia style from mongo: style ${style}`
        ),
        failedToGetStyleAtsData: (originalError, stylesToCheck) => createError(
            originalError,
            'failed-to-get-style-ats-data',
            `Failed to get current ats data for styles: ${stylesToCheck}`
        )
    }
}
