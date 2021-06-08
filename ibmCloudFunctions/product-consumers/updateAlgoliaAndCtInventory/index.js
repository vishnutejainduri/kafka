const algoliasearch = require('algoliasearch');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { productApiRequest } = require('../../lib/productApi');
const { createLog, log, addErrorHandling } = require('../utils');
const {
    buildSizesArray,
    buildStoreInventory,
    buildStoresArray,
    getSkuInventoryBatchedByStyleId,
    logCtAtsUpdateErrors,
    logCtAtsUpdateSuccesses
} = require('./utils');
const { updateSkuAtsForManyCtProductsBatchedByStyleId } = require('./commercetools')
const getCtHelpers = require('../../lib/commercetoolsSdk')

let algoliaClient = null;
let algoliaIndex = null;
let ctHelpers = null;

global.main = async function (params) {
    log(createLog.params('updateAlgoliaAndCtInventory', params));

    if (!params.algoliaIndexName || !params.algoliaApiKey || !params.algoliaAppId) {
        throw new Error('Requires Algolia configuration. See manifest.yml');
    }

    if (algoliaIndex === null) {
        try {
            algoliaClient = algoliasearch(params.algoliaAppId, params.algoliaApiKey);
            algoliaClient.setTimeouts({
                connect: 600000,
                read: 600000,
                write: 600000
            });
            algoliaIndex = algoliaClient.initIndex(params.algoliaIndexName);
        }
        catch (originalError) {
            throw createError.failedAlgoliaConnection(originalError);
        }
    }

    if (!ctHelpers) {
        ctHelpers = getCtHelpers(params);
      }

    let styleAvailabilityCheckQueue;
    let styles;
    let skus;
    let updateAlgoliaAndCtInventoryCount;
    try {
        styleAvailabilityCheckQueue = await getCollection(params);
        styles = await getCollection(params, params.stylesCollectionName);
        skus = await getCollection(params, params.skusCollectionName);
        updateAlgoliaAndCtInventoryCount = await getCollection(params, 'updateAlgoliaInventoryCount');
    } catch (originalError) {
        throw createError.failedDbConnection(originalError, params && params.collectionName);
    }

    let stylesToCheck;
    try {
        stylesToCheck = await styleAvailabilityCheckQueue.find().limit(40).toArray();
    } catch (originalError) {
        throw createError.updateAlgoliaAndCtInventory.failedToGetStylesToCheck(originalError);
    }

    const styleAvailabilitiesToBeSynced = await Promise.all(stylesToCheck.map(addErrorHandling(async style => {
        // for some reason we don't have style data in the DPM for certain styles referenced in inventory data
        const styleData = await styles.findOne({ _id: style.styleId })
            .catch(originalError => {
                throw createError.updateAlgoliaAndCtInventory.failedToGetStyle(originalError, style);
            });
        if (!style.styleId || !styleData || styleData.isOutlet) return null;
        const styleSkus = await skus.find({ styleId: style.styleId }).toArray();
        const styleAts = await productApiRequest(params, `/inventory/ats/${styleData._id}`)
            .catch(originalError => {
                throw createError.updateAlgoliaAndCtInventory.failedToGetApiResponse(originalError, styleData._id);
            });
        return {
            isAvailableToSell: styleAts.ats > 0,
            isOnlineAvailableToSell: styleAts.onlineAts > 0,
            sizes: buildSizesArray(styleSkus, false),
            onlineSizes: buildSizesArray(styleSkus, true),
            storeInventory: buildStoreInventory(styleSkus),
            stores: buildStoresArray(styleSkus),
            objectID: styleData._id
        };
    })));

    const styleIdsForAvailabilitiesToBeSynced = stylesToCheck.map(style => style.styleId);

    const recordsWithError = styleAvailabilitiesToBeSynced.filter(rec => rec instanceof Error);
    if (recordsWithError.length > 0) {
        log(createError.updateAlgoliaAndCtInventory.failedRecords(null, recordsWithError.length, styleAvailabilitiesToBeSynced.length, recordsWithError), 'ERROR');
        recordsWithError.forEach(originalError => {
            log(createError.updateAlgoliaAndCtInventory.failedRecord(originalError), 'ERROR');
        });
    }

    const stylesIdsToUpdate = [];
    const recordsToUpdate = styleAvailabilitiesToBeSynced.filter((record, index) => {
        if (record && !(record instanceof Error)) {
            stylesIdsToUpdate.push(styleIdsForAvailabilitiesToBeSynced[index]);
            return true;
        }
        return false;
    });
    if (recordsToUpdate.length) {
        try {
            await algoliaIndex.partialUpdateObjects(recordsToUpdate, true);
            log(`Updated Algolia availability for styles: ${stylesIdsToUpdate}`);
        } catch (error) {
            log(`Error: Failed to send styles to Algolia (${stylesIdsToUpdate}): ${error.message}`, 'ERROR');
            throw error;
        }
        await updateAlgoliaAndCtInventoryCount
            .insert({ batchSize: styleAvailabilitiesToBeSynced.length })
            .catch (() => {
                log('Error: failed to update Algolia inventory count.');
            });
    }

    const skuInventoryBatchedByStyleId = await getSkuInventoryBatchedByStyleId({ styleIds: styleIdsForAvailabilitiesToBeSynced, skuCollection: skus, params });
    const permanentFailuresStyleIds = skuInventoryBatchedByStyleId.filter(skuBatch => skuBatch && (skuBatch.skus.length === 0 || !skuBatch.skus)); //Styles with no SKUs should be removed form the queue.
    
    const skuInventoryBatchedByStyleIdReduced = skuInventoryBatchedByStyleId.reduce((previous, current) => previous.concat(current ? current.skus : null), [])
    const ctAtsUpdateResults = await updateSkuAtsForManyCtProductsBatchedByStyleId(skuInventoryBatchedByStyleIdReduced, ctHelpers);
   
    const idsOfSuccessfullyUpdatedCtStyles = ctAtsUpdateResults
        .filter(styleUpdateResult => styleUpdateResult && styleUpdateResult.ok)
        .map(({ styleId }) => styleId);
    
    const idsOfPermanentFailuresStyleIds = permanentFailuresStyleIds.map(({ styleId }) => styleId);
    log(`Found Permanent Failures for these styleIds: ${JSON.stringify(idsOfPermanentFailuresStyleIds)} and they will be removed from the queue.`)

    logCtAtsUpdateErrors(ctAtsUpdateResults);
    logCtAtsUpdateSuccesses(ctAtsUpdateResults);

    console

    const styleIdsToCleanup = styleIdsForAvailabilitiesToBeSynced
        .filter((_, index) => !(styleAvailabilitiesToBeSynced[index] instanceof Error)) // Algolia successes
        .filter(styleId => idsOfSuccessfullyUpdatedCtStyles.includes(styleId) || idsOfPermanentFailuresStyleIds.includes(styleId)); // CT successes or Permanent Failures
        
    
    try {
        await styleAvailabilityCheckQueue.deleteMany({ _id: { $in: styleIdsToCleanup } });
    } catch (originalError) {
        throw createError.updateAlgoliaAndCtInventory.failedToRemoveFromQueue(originalError, styleIdsToCleanup);
    }

    return {
        successCount: styleIdsToCleanup.length,
        failureCount: stylesIdsToUpdate.length - styleIdsToCleanup.length
    };
}

module.exports = global.main;
