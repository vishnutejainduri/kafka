const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { createLog, log, addErrorHandling } = require('../utils');
//const { buildSizesArray, buildStoreInventory, buildStoresArray } = require('./utils');

global.main = async function (params) {
    log(createLog.params('removeQuantityReserved', params));

    let skus;
    try {
        skus = await getCollection(params, params.collectionName);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError, params && params.collectionName);
    }

    let skusToCheck;
    try {
        skusToCheck = await skus.find().limit(40).toArray();
    } catch (originalError) {
        throw createError.removeQuantityReserved.failedToGetSkusToCheck(originalError);
    }
    console.log('skusToCheck', skusToCheck);

    /*const styleAvailabilitiesToBeSynced = await Promise.all(stylesToCheck.map(addErrorHandling(async style => {
        // for some reason we don't have style data in the DPM for certain styles referenced in inventory data
        const styleData = await styles.findOne({ _id: style.styleId })
            .catch(originalError => {
                throw createError.updateAlgoliaInventory.failedToGetStyle(originalError, style);
            });
        if (!styleData || styleData.isOutlet) return null;
        const styleSkus = await skus.find({ styleId: style.styleId }).toArray();
        const styleAts = await productApiRequest(params, `/inventory/ats/${styleData._id}`)
            .catch(originalError => {
                throw createError.updateAlgoliaInventory.failedToGetApiResponse(originalError, styleData._id);
            });
        return {
            isAvailableToSell: styleAts.ats > 0,
            isOnlineAvailableToSell: styleAts.onlineAts > 0,
            sizes: buildSizesArray(styleSkus),
            storeInventory: buildStoreInventory(styleSkus),
            stores: buildStoresArray(styleSkus),
            objectID: styleData._id
        };
    })));

    const styleIdsForAvailabilitiesToBeSynced = stylesToCheck.map(style => style.styleId);

    const recordsWithError = styleAvailabilitiesToBeSynced.filter(rec => rec instanceof Error);
    if (recordsWithError.length > 0) {
        log(createError.updateAlgoliaInventory.failedRecords(null, recordsWithError.length, styleAvailabilitiesToBeSynced.length), "ERROR");
        recordsWithError.forEach(originalError => {
            log(createError.updateAlgoliaInventory.failedRecord(originalError), "ERROR");
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
            await index.partialUpdateObjects(recordsToUpdate, true);
            log(`Updated availability for styles: ${stylesIdsToUpdate}`);
        } catch (error) {
            log('Error: Failed to send styles to Algolia.');
            throw error;
        }
        await updateAlgoliaInventoryCount
            .insert({ batchSize: styleAvailabilitiesToBeSynced.length })
            .catch (() => {
                log('Error: failed to update algolia inventory count.');
            });
    }

    const styleIdsToCleanup = styleIdsForAvailabilitiesToBeSynced.filter((_, index) => !(styleAvailabilitiesToBeSynced[index] instanceof Error));
    try {
        await styleAvailabilityCheckQueue.deleteMany({ _id: { $in: styleIdsToCleanup } });
    } catch (originalError) {
        throw createError.updateAlgoliaInventory.failedToRemoveFromQueue(originalError, styleIdsToCleanup);
    }*/
}

module.exports = global.main;
