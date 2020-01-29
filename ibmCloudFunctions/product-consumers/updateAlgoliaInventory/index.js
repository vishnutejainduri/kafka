const algoliasearch = require('algoliasearch');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { productApiRequest } = require('../../lib/productApi');
const { createLog, log, addErrorHandling } = require('../utils');
const { buildSizesArray, buildStoreInventory, buildStoresArray } = require('./utils');

let client = null;
let index = null;

global.main = async function (params) {
    log(createLog.params('updateAlgoliaInventory', params));

    if (!params.algoliaIndexName || !params.algoliaApiKey || !params.algoliaAppId) {
        throw new Error('Requires Algolia configuration. See manifest.yml');
    }

    if (index === null) {
        try {
            client = algoliasearch(params.algoliaAppId, params.algoliaApiKey);
            client.setTimeouts({
                connect: 600000,
                read: 600000,
                write: 600000
            });
            index = client.initIndex(params.algoliaIndexName);
        }
        catch (originalError) {
            throw createError.failedAlgoliaConnection(originalError);
        }
    }

    let styleAvailabilityCheckQueue;
    let styles;
    let updateAlgoliaInventoryCount;
    try {
        styleAvailabilityCheckQueue = await getCollection(params);
        styles = await getCollection(params, params.stylesCollectionName)
        updateAlgoliaInventoryCount = await getCollection(params, 'updateAlgoliaInventoryCount');
    } catch (originalError) {
        throw createError.failedDbConnection(originalError, params && params.collectionName);
    }

    let stylesToCheck;
    try {
        stylesToCheck = await styleAvailabilityCheckQueue.find().limit(40).toArray();
    } catch (originalError) {
        throw createError.updateAlgoliaInventory.failedToGetStylesToCheck(originalError);
    }

    const styleAvailabilitiesToBeSynced = await Promise.all(stylesToCheck.map(addErrorHandling((style) => styles.findOne({ _id: style.styleId })
        // for some reason we don't have style data in the DPM for certain styles referenced in inventory data
        .then((styleData) => {
            if (!styleData || !styleData.ats || styleData.isOutlet) return null;
            return productApiRequest(params, `/inventory/ats/${styleData._id}`)
                .then((styleAts) => ({
                    isAvailableToSell: styleAts.ats > 0,
                    isOnlineAvailableToSell: styleAts.onlineAts > 0,
                    sizes: buildSizesArray(styleData.ats),
                    storeInventory: buildStoreInventory(styleData.ats),
                    stores: buildStoresArray(styleData.ats),
                    objectID: styleData._id
                }))
                .catch(originalError => {
                    throw createError.updateAlgoliaInventory.failedToGetApiResponse(originalError, styleData._id);
                });
        })
        .catch(originalError => {
            throw createError.updateAlgoliaInventory.failedToGetStyle(originalError, style);
        })
    )));

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
            console.log('recordsToUpdate', recordsToUpdate);
            await index.partialUpdateObjects(recordsToUpdate, true);
            log('Updated availability for styles ', stylesIdsToUpdate);
        } catch (error) {
            log('Failed to send styles to Algolia.', "ERROR");
            log(params.messages, "ERROR");
            throw error;
        }
        await updateAlgoliaInventoryCount
            .insert({ batchSize: styleAvailabilitiesToBeSynced.length })
            .catch (() => {
                log('Failed to update algolia inventory count.', "ERROR");
            });
    }

    const styleIdsToCleanup = styleIdsForAvailabilitiesToBeSynced.filter((_, index) => !(styleAvailabilitiesToBeSynced[index] instanceof Error));
    try {
        await styleAvailabilityCheckQueue.deleteMany({ _id: { $in: styleIdsToCleanup } });
    } catch (originalError) {
        throw createError.updateAlgoliaInventory.failedToRemoveFromQueue(originalError, styleIdsToCleanup);
    }
}

module.exports = global.main;
