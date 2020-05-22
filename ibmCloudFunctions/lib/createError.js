// message and stack on Error instance are not enumerable
// and will be ignored if not explicitly set 
function errorToObject(error) {
    return {
        ...error,
        message: error.message,
        stack: error.stack,
    };
}

// eslint-disable-next-line no-unused-vars
const getParamsExcludingMessages = ({ messages, ...paramsExcludingMessages }) => paramsExcludingMessages;

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
    failedDbConnection: (originalError) => new CustomError(
        originalError,
        'failed-db-connection'
    ),
    consumeInventoryMessage: {
        failed: (originalError, params) => new CustomError(
            originalError,
            'failed-consume-inventory-message',
            `Failure in run of consume inventory message; params: ${getParamsExcludingMessages(params)}.`
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
    consumeSkuMessage: {
        failedAllUpdates: (originalError, skuData) => new CustomError(
            originalError,
            'failed-consume-sku-message',
            `Failure in run of consume sku message; skuData: ${skuData}.`
        ),
        failedSkuUpdate: (originalError, skuData) => new CustomError(
            originalError,
            'failed-consume-sku-message-sku-update',
            `Failure in sku update run of consume sku message; skuData: ${skuData}.`
        ),
        failedUpdateStyleAts: (originalError, skuData) => new CustomError(
            originalError,
            'failed-consume-sku-message-update-style-ats',
            `Failure to update style ats in run of consume sku message; skuData: ${skuData}.`
        ),
    },
    consumeSkuMessageCt: {
        failed: (originalError, params) => new CustomError(
            originalError,
            'failed-consume-sku-message-ct',
            `Failure in run of consume sku message; params excluding messages: ${getParamsExcludingMessages(params)}.`
        )
    },
    consumeCatalogMessage: {
        failed: (originalError, params) => new CustomError(
            originalError,
            'failed-consume-catalog-message',
            `Failure in run of consume catalog message; params excluding messages: ${getParamsExcludingMessages(params)}.`
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
        ),
        failedBulkAtsInsert: (originalError, styleData) => new CustomError(
            originalError,
            'failed-bulk-ats-insert',
            `Failed to insert a style for bulk ats recalculation; style data: ${styleData}.`
        )
    },
    consumeCatalogMessageCT: {
        failed: (originalError, params) => new CustomError(
            originalError,
            'failed-consume-catalog-message-ct',
            `Failure in run of consume catalog message CT; params excluding messages: ${getParamsExcludingMessages(params)}.`
        )
    },
    removeQuantityReserved: {
        failedToRemoveSomeReserves: (originalError, params) => new CustomError(
            originalError,
            'failed-to-remove-some-reserves',
            `Failure in run of remove quantity reserved; params excluding messages: ${getParamsExcludingMessages(params)}.`
        )
    },
    consumeSalesOrderMessageCT: {
        failed: (originalError, params) => new CustomError(
            originalError,
            'failed-consume-sales-order-message-ct',
            `Failure in run of consume sales order message CT; params excluding messages: ${getParamsExcludingMessages(params)}.`
        )
    },
    consumeSalesOrderDetailsMessageCT: {
        failed: (originalError, params) => new CustomError(
            originalError,
            'failed-consume-sales-order-details-message-ct',
            `Failure in run of consume sales order details message CT; params excluding messages: ${getParamsExcludingMessages(params)}.`
        )
    },
    consumeFacetMessageCT: {
        failed: (originalError, params) => new CustomError(
            originalError,
            'failed-consume-facet-message-ct',
            `Failure in run of consume facet message CT; params; params excluding messages: ${getParamsExcludingMessages(params)}.`
        )
    },
    consumeBarcodeMessageCT: {
        failed: (originalError, params) => new CustomError(
            originalError,
            'failed-consume-barcode-message-ct',
            `Failure in run of consume barcode message CT; params excluding messages: ${getParamsExcludingMessages(params)}.`
        )
    },
    consumeSalePriceCT: {
        failed: (originalError, params) => new CustomError(
            originalError,
            'failed-consume-sale-price-ct',
            `Failure in run of consume sale price CT; params excluding messages: ${getParamsExcludingMessages(params)}.`
        ),
    },
    consumeStylesBasicMessageCT: {
        failed: (originalError, params) => new CustomError(
            originalError,
            'failed-consume-styles-basic-message-ct',
            `Failure in run of consume styles basic message CT; params excluding messages: ${getParamsExcludingMessages(params)}.`
        ),
    },
    calculateAvailableToSell: {
        failed: (originalError, paramsExcludingMessages) => new CustomError(
            originalError,
            'failed-calculate-available-to-sell',
            `Failure in run of calculate available to sell; params excluding messages: ${paramsExcludingMessages}.`
        ),
        failedRemoveStyleAts: (originalError, atsData) => new CustomError(
            originalError,
            'failed-style-ats-remove',
            `Failed to remove style ats; inventory: ${atsData}.`
        ),
        failedUpdateStyleAts: (originalError, atsData) => new CustomError(
            originalError,
            'failed-style-ats-update',
            `Failed to update style ats; inventory: ${atsData}.`
        ),
        failedRemoveSkuAts: (originalError, atsData) => new CustomError(
            originalError,
            'failed-sku-ats-remove',
            `Failed to remove sku ats; inventory: ${atsData}.`
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
        ),
        failedBulkAtsInsert: (originalError, atsData) => new CustomError(
            originalError,
            'failed-bulk-ats-insert',
            `Failed to insert a style for bulk ats recalculation; ats data: ${atsData}.`
        ),
        partialFailure: (messages, messageFailures) => new CustomError(
            null,
            'partial-failure-calculate-available-to-sell',
            `Failed to update ${messageFailures.length} out of ${messages.length} messages.`,
            {
                messages: JSON.stringify(messages),
                messageFailures: JSON.stringify(messageFailures)
            }
        )
    },
    bulkCalculateAvailableToSell: {
        failedGetStyle: (originalError, styleToRecalcAts) => new CustomError(
            originalError,
            'failed-get-style',
            `Failed to get style for bulk ats update; style: ${styleToRecalcAts}.`
        ),
        failedGetSku: (originalError, styleToRecalcAts) => new CustomError(
            originalError,
            'failed-get-sku',
            `Failed to get sku for bulk ats update; style: ${styleToRecalcAts}.`
        ),
        failedGetInventory: (originalError, skuData) => new CustomError(
            originalError,
            'failed-get-inventory',
            `Failed to get inventory for bulk ats update; sku: ${skuData}.`
        ),
        failedGetStore: (originalError, inventoryData) => new CustomError(
            originalError,
            'failed-get-store',
            `Failed to get store for bulk ats update; inventory: ${inventoryData}.`
        ),
        failedCalculateSkuAts: (originalError, skuRecord) => new CustomError(
            originalError,
            'failed-to-calculate-sku-ats',
            `Failed to calculate sku ats; sku: ${skuRecord}.`
        ),
        failedAllUpdates: (originalError, stylesToRecalcAts) => new CustomError(
            originalError,
            'failed-all-updates',
            `Failed to run all bulk ats updates; style: ${stylesToRecalcAts}.`
        ),
        failedAllAtsUpdates: (originalError, stylesToRecalcAts) => new CustomError(
            originalError,
            'failed-all-ats-updates',
            `Failed to run all bulk ats queries; style: ${stylesToRecalcAts}.`
        ),
        failedUpdateSkuAts: (originalError, skuData) => new CustomError(
            originalError,
            'failed-sku-ats-update',
            `Failed to update sku bulk ats; sku: ${skuData}.`
        ),
        failedUpdateStyleAts: (originalError, styleToRecalcAts) => new CustomError(
            originalError,
            'failed-style-ats-update',
            `Failed to update style bulk ats; style: ${styleToRecalcAts}.`
        ),
        failedToRemoveFromQueue: (originalError, styleIds) => new CustomError(
            originalError,
            'failed-to-remove-from-queue',
            `Failed to remove from algolia bulk ats mongo queue the following style ids: ${styleIds}`
        ),
        failedToAddToAlgoliaQueue: (originalError, styleIds) => new CustomError(
            originalError,
            'failed-to-add-to-queue',
            `Failed to add to algolia bulk ats mongo queue the following style ids: ${styleIds}`
        ),
        failedToGetRecords: (originalError) => new CustomError(
            originalError,
            'failed-to-get-records-from-algolia-mongo-queue',
            'Failed to get any records from the algolia mongo queue'
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
        failedRecords: (_, failed, total) => new CustomError(
            null,
            'failed-prepare-styles-for-algolia',
            `Failed to prepare ${failed} of ${total} styles for Algolia.`
        ),
        failedToGetStylesToCheck: (originalError) => new CustomError(
            originalError,
            'failed-to-get-styles-to-check',
            'Failed to get styles to check'
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
        ),
        partialFailure: (messages, errors) => new CustomError(
            null,
            'partial-failure-consuming-threshold-message',
            `Failed to consume ${errors.length} out of ${messages.length} messages.`,
            {
                errors: errors.map(errorToObject)
            }
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
        ),
        failedBulkAtsInsert: (originalError, recalcAtsStyleIds) => new CustomError(
            originalError,
            'failed-to-bulk-ats-insert',
            `Failed to bulk ats insert styles; styles: ${recalcAtsStyleIds}.`
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
    consumeSalePrice: {
        failedSalePriceUpdate: (originalError, updatedPrice) => new CustomError(
            originalError,
            'failed-sale-price-update',
            `Failed to update price for ${updatedPrice.id}: ${updatedPrice}`,
            {
                updatedPrice
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
    },
    deleteCreateAlgoliaStyles: {
        partialFailure: (messages, messageFailures) => new CustomError(
            null,
            'partial-failure-delete-create-algolia-styles',
            `Failed to update ${messageFailures.length} out of ${messages.length} messages.`,
            {
                messages: JSON.stringify(messages),
                messageFailures: JSON.stringify(messageFailures)
            }
        )
    },
    messagesLogs: {
        storeValues: {
            partialFailure: (originalError, totalInsertLength, failedIndices) => new CustomError(
                originalError,
                'partial-failure-messagesLogs-storeValues',
                `Failed to insert ${failedIndices.length} of ${totalInsertLength}`,
                {
                    insertStatus: failedIndices
                        .reduce((status, failedIndex) => {
                            status[failedIndex] = false;
                            return status;
                        }, {})
                }
            )
        }
    },
    resolveMessageLogs: {
        batchFailure: (originalError, debugInfo) => new CustomError(
            originalError,
            'partial-failure-failed-batch.',
            `Failure to resolve batch with activation ID ${debugInfo.activationID}.`,
            debugInfo
        ),
        partialFailure: (_, debugInfo) => new CustomError(
            null,
            'partial-failure.',
            'Failure to completely resolve all the batches.',
            debugInfo
        ),
        failedToDlq: (originalError, debugInfo) => new CustomError(
            originalError,
            'partial-failure-failed-to-dlq',
            `Failure to DLQ messages for batch with activation ID ${debugInfo.activationID}.`,
            debugInfo
        ),
        failedToRetry: (originalError, debugInfo) => new CustomError(
            originalError,
            'partial-failure-failed-to-retry',
            `Failure to retry messages for batch with activation ID ${debugInfo.activationID}.`,
            debugInfo
        ),
        failedToFetchMessages: (originalError, debugInfo) => new CustomError(
            originalError,
            'partial-failure-failed-to-fetch-batch-messages',
            `Failure to fetch batch messages for batch with activation ID ${debugInfo.activationID}.`,
            debugInfo
        ),
    }
}
