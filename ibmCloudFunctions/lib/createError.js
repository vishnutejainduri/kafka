// TODO: constructor should be called at the point of error to better identify the line of error
// ref: https://stackoverflow.com/a/871646
// e.g. throw new CustomError(...) instead of throw createError(...)
// TODO: each error type should have a different instance
// so that in units tests we can identify exactly which errors has been produced
function getErrorParams(originalError, name, message) {
    if (originalError) {
        const {
            stack: originalStack,
            name: originalName,
            code: OriginalCode,
            message: OriginalMessage,
            ...originalDebugInfo
        } = originalError;
    
        return {
            originalDebugInfo,
            message: `${message} --- Caused by: ${OriginalMessage}`,
            name:  `${name} --- Caused by: ${OriginalCode || originalName}`,
            stack: originalStack,
        }
    } else {
        return {
            message,
            name
        }
    }
}

class CustomError extends Error {
    constructor(originalError, name, message, debugInfo) {
        const errorParams = getErrorParams(originalError, name, message);
        super(errorParams.message);
        Object.assign(this, errorParams);
        this.debugInfo = debugInfo;
        this.code = errorParams.name; // https://github.com/nodejs/help/issues/789
    }
}

module.exports = {
    failedSchemaValidation: (validationErrors, entityName, message = '') => new CustomError(
        null,
        `failed-schema-validation-${entityName}`,
        `${message || `Failed schema validation for ${entityName}`}: ${
            validationErrors.reduce((errorString, error, index) => `#${index+1}: ${error.message}, ${errorString}`,'')
        }`,
        {
            validationErrors: validationErrors
        }
    ),
    failedAlgoliaConnection: (originalError) => new CustomError(
        originalError,
        'failed-algolia-connection',
        'Failed to connect to Algolia.'
    ),
    failedDbConnection: (originalError, collectionName, params) => new CustomError(
        originalError,
        'failed-db-connection',
        `Failed to connect to db${collectionName ? ` for collection ${collectionName}` : ''}.`,
        params
    ),
    consumeInventoryMessage: {
        failed: (originalError, params) => new CustomError(
            originalError,
            'failed-consume-inventory-message',
            `Failure in run of consume inventory message; params: ${params}.`
        ),
        failedUpdateInventory: (originalError, inventoryData) => new CustomError(
            originalError,
            'failed-inventory-update',
            `Failed to update inventory; inventory: ${inventoryData}.`
        ),
        failedUpdateStyle: (originalError, styleId) => new CustomError(
            originalError,
            'failed-style-update',
            `Failed to update style; style Id: ${styleId}.`
        ),
        failedUpdates: (originalError, inventoryData) => new CustomError(
            originalError,
            'failed-updates',
            `Failed to run inventory updates on style and inventory; inventory data: ${inventoryData}.`
        ),
        partialFailure: (messages, messageFailures) => new CustomError(
            null,
            'partial-failure-consuming-sku-inventory-messages',
            `Failed to update ${messageFailures.length} out of ${messages.length} messages.`,
            {
                messages,
                messageFailures
            }
        )
    },
    consumeCatalogMessage: {
        failed: (originalError, params) => new CustomError(
            originalError,
            'failed-consume-catalog-message',
            `Failure in run of consume catalog message; params: ${params}.`
        ),
        failedStyleUpdates: (originalError, styleData) => new CustomError(
            originalError,
            'failed-style-updates',
            `Failed to run styles updates; style data: ${styleData}.`
        ),
        failedPriceUpdates: (originalError, styleData) => new CustomError(
            originalError,
            'failed-style-price-updates',
            `Failed to run price updates for a style; style data: ${styleData}.`
        )
    },
    calculateAvailableToSell: {
        failed: (originalError, paramsExcludingMessages) => new CustomError(
            originalError,
            'failed-calculate-available-to-sell',
            `Failure in run of calculate available to sell; params excluding messages: ${paramsExcludingMessages}.`
        ),
        failedUpdateStyleAts: (originalError, atsData) => new CustomError(
            originalError,
            'failed-style-ats-update',
            `Failed to update style ats; inventory: ${atsData}.`
        ),
        failedUpdateSkuAts: (originalError, atsData) => new CustomError(
            originalError,
            'failed-sku-ats-update',
            `Failed to update sku ats; inventory: ${atsData}.`
        ),
        failedAddToAlgoliaQueue: (originalError, atsData) => new CustomError(
            originalError,
            'failed-add-to-algolia-queue',
            `Failed to add style for inventory update to algolia mongo queue; inventory: ${atsData}.`
        ),
        failedGetStyle: (originalError, atsData) => new CustomError(
            originalError,
            'failed-get-style',
            `Failed to get style for ats update; inventory: ${atsData}.`
        ),
        failedGetSku: (originalError, atsData) => new CustomError(
            originalError,
            'failed-get-sku',
            `Failed to get sku for ats update; inventory: ${atsData}.`
        ),
        failedGetStore: (originalError, atsData) => new CustomError(
            originalError,
            'failed-get-store',
            `Failed to get store for ats update; inventory: ${atsData}.`
        ),
        failedAllUpdates: (originalError, atsData) => new CustomError(
            originalError,
            'failed-all-updates',
            `Failed to run all ats queries; inventory: ${atsData}.`
        )
    },
    consumeDep27FulfillMessage: {
        failed: (originalError, paramsExcludingMessages) => new CustomError(
            originalError,
            'failed-consume-dep27-message',
            `Failure in run of consume dep 27 message; params excluding messages: ${paramsExcludingMessages}.`
        ),
        failedUpdates: (originalError, storeId) => new CustomError(
            originalError,
            'failed-consume-dep27-message-updates',
            `Failure to run all db updates for dep27; store id: ${storeId}`
        )
    },
    updateAlgoliaStyle: {
        failedRecords: (_, failed, total) => new CustomError(
            null,
            'failed-prepare-styles-for-algolia',
            `Failed to prepare ${failed} of ${total} styles for Algolia.`
        ),
        failedRecord: (originalError) => new CustomError(
            originalError,
            'failed-prepare-style-for-algolia',
            'Failed to prepare a style for Algolia'
        ),
    },
    updateAlgoliaInventory: {
        failedRecord: (originalError) => new CustomError(
            originalError,
            'failed-record',
            'Failed to update algolia ats'
        ),
        failedToGetApiResponse: (originalError, styleId) => new CustomError(
            originalError,
            'failed-to-get-api-response',
            `Failed to get api response; style Id: ${styleId}.`
        ),
        failedToRemoveFromQueue: (originalError, styleIds) => new CustomError(
            originalError,
            'failed-to-remove-from-queue',
            `Failed to remove from algolia mongo queue the following style ids: ${styleIds}`
        ),
        failedToGetRecords: (originalError) => new CustomError(
            originalError,
            'failed-to-get-records-from-algolia-mongo-queue',
            'Failed to get any records from the algolia mongo queue'
        ),
        failedToGetStyle: (originalError, style) => new CustomError(
            originalError,
            'failed-to-get-style-from-mongo',
            `Failed to get relevant algolia style from mongo: style ${style}`
        ),
        failedToGetStyleAtsData: (originalError, stylesToCheck) => new CustomError(
            originalError,
            'failed-to-get-style-ats-data',
            `Failed to get current ats data for styles: ${stylesToCheck}`
        )
    },
    consumeThresholdMessage: {
        failed: (originalError, paramsExcludingMessages) => new CustomError(
            originalError,
            'failed-consume-threshold-message',
            `Failure in run of consume threshold message; params excluding messages: ${paramsExcludingMessages}.`
        ),
        failedUpdates: (originalError, thresholdData) => new CustomError(
            originalError,
            'failed-updates',
            `Failed to run any queries on mongo for thresholds on sku, styles and algolia queue; threshold data: ${thresholdData}.`
        ),
        failedToGetSku: (originalError, thresholdData) => new CustomError(
            originalError,
            'failed-get-sku-record',
            `Failed to get a sku record from mongo; threshold data: ${thresholdData}.`
        ),
        failedToGetStyle: (originalError, thresholdData) => new CustomError(
            originalError,
            'failed-get-style-record',
            `Failed to get a style record from mongo; threshold data: ${thresholdData}.`
        ),
        failedToUpdateStyleThreshold: (originalError, styleData) => new CustomError(
            originalError,
            'failed-to-update-style-threshold',
            `Failed to update the thresholds on a style; style data: ${styleData}.`
        ),
        failedToUpdateSkuThreshold: (originalError, thresholdData) => new CustomError(
            originalError,
            'failed-to-update-sku-threshold',
            `Failed to update the thresholds on a sku; threshold data: ${thresholdData}.`
        ),
        failedAddToAlgoliaQueue: (originalError, styleData) => new CustomError(
            originalError,
            'failed-to-add-to-algolia-queue',
            `Failed to add style inventory update to algolia mongo queue; style data: ${styleData}.`
        )
    },
    consumeStoresMessage: {
        failed: (originalError, paramsExcludingMessages) => new CustomError(
            originalError,
            'failed-consume-stores-message',
            `Failure in run of consume stores message; params excluding messages: ${paramsExcludingMessages}.`
        ),
        failedToUpdateStore: (originalError, storeId) => new CustomError(
            originalError,
            'failed-to-update-store',
            `Failed to update store record; store id: ${storeId}.`
        )
    },
    consumeStoresFulfillMessage: {
        failed: (originalError, paramsExcludingMessages) => new CustomError(
            originalError,
            'failed-consume-stores-fulfill-message',
            `Failure in run of consume stores fulfill message; params excluding messages: ${paramsExcludingMessages}.`
        ),
        failedToUpdateStore: (originalError, storeId) => new CustomError(
            originalError,
            'failed-store-update',
            `Failed to update store; store Id: ${storeId}.`
        )
    },
    updateAlgoliaPrice: {
        partialFailure: (messages, messageFailures) => new CustomError(
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
        noStyleId: () => new CustomError(
            null,
            'failed-to-parse-price-message-no-style-id',
            'Failed to parse price message because style ID does not exist.'
        )
    },
    addFacetsToBulkImportQueue: {
        failedParseMessage: (originalError, message) => new CustomError(
            originalError,
            'addFacetsToBulkImportQueue:failed-to-parse-facet-message',
            'Failed to parse facet update message.',
            {
                message
            }
        ),
        failedUpdateFacetQueue: (originalError, message) => new CustomError(
            originalError,
            'addFacetsToBulkImportQueue:failed-to-update-facet-queue',
            'Failed to update facet queue for algolia.',
            {
                message
            }
        ),
        partialFailure: (messages, messageFailures) => new CustomError(
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
