const createError = (originalError, name, message, debugInfo) => {
    const error = new Error();

    if (originalError) {
        const {
            stack: originalStack,
            name: originalName,
            code: OriginalCode,
            message: OriginalMessage,
            ...originalDebugInfo
        } = originalError;
    
        Object.assign(error, {
            originalDebugInfo,
            message: `${message} --- Caused by: ${OriginalMessage}`,
            name:  `${name} --- Caused by: ${OriginalCode || originalName}`,
            stack: originalStack,
        });
    } else {
        Object.assign(error, {
            message,
            name
        });
    }

    error.debugInfo = debugInfo;
    error.code = error.name; // https://github.com/nodejs/help/issues/789
    return error;
}

module.exports = {
    failedAlgoliaConnection: (originalError) => createError(
        originalError,
        'failed-algolia-connection',
        'Failed to connect to Algolia.'
    ),
    failedDbConnection: (originalError, collectionName, params) => createError(
        originalError,
        'failed-db-connection',
        `Failed to connect to db${collectionName ? ` for collection ${collectionName}` : ''}.`,
        params
    ),
    consumeInventoryMessage: {
        failed: (originalError, params) => createError(
            originalError,
            'failed-consume-inventory-message',
            `Failure in run of consume inventory message; params: ${params}.`
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
            ),
            partialFailure: (messages, messageFailures) => createError(
                null,
                'partial-failure-consuming-sku-inventory-messages',
                `Failed to update ${messageFailures.length} out of ${messages.length} messages.`,
                {
                    messages,
                    messageFailures
                }
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
    updateAlgoliaInventory: {
        failedRecord: (originalError) => createError(
            originalError,
            'failed-record',
            'Failed to update algolia ats'
        ),
        failedToGetApiResponse: (originalError, styleId) => createError(
            originalError,
            'failed-to-get-api-response',
            `Failed to get api response; style Id: ${styleId}.`
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
    },
    updateAlgoliaPrice: {
        partialFailure: (messages, messageFailures) => createError(
            null,
            'partial-failure-updating-algolia-price',
            `Failed to update ${messageFailures.length} out of ${messages.length} messages.`,
            {
                messages,
                messageFailures
            }
        )
    },
    parsePriceMessage: {
        noStyleId: () => createError(
            null,
            'failed-to-parse-price-message-no-style-id',
            'Failed to parse price message because style ID does not exist.'
        )
    },
    addFacetsToBulkImportQueue: {
        failedParseMessage: (originalError, message) => createError(
            originalError,
            'addFacetsToBulkImportQueue:failed-to-parse-facet-message',
            'Failed to parse facet update message.',
            {
                message
            }
        ),
        failedUpdateFacetQueue: (originalError, message) => createError(
            originalError,
            'addFacetsToBulkImportQueue:failed-to-update-facet-queue',
            'Failed to update facet queue for algolia.',
            {
                message
            }
        ),
        partialFailure: (messages, messageFailures) => createError(
            null,
            'partial-failure-updating-algolia-facet-queue',
            `Failed to update ${messageFailures.length} out of ${messages.length} messages.`,
            {
                messages: JSON.stringify(messages),
                messageFailures: JSON.stringify(messageFailures)
            }
        )
    }
}
