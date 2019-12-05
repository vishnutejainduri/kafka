const algoliasearch = require('algoliasearch');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { productApiRequest } = require('../../lib/productApi');
const { createLog, log, addErrorHandling } = require('../utils');

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
    let stylesToCheck;
    try {
        styleAvailabilityCheckQueue = await getCollection(params);
        styles = await getCollection(params, params.stylesCollectionName)
        updateAlgoliaInventoryCount = await getCollection(params, 'updateAlgoliaInventoryCount');
        stylesToCheck = await styleAvailabilityCheckQueue.find().limit(40).toArray();
    } catch (originalError) {
        throw createError.failedDbConnection(originalError, params && params.collectionName);
    }

    const styleIds = stylesToCheck.map(addErrorHandling((style) => style.styleId));

    let styleAvailabilitiesToBeSynced = await Promise.all(stylesToCheck.map(addErrorHandling((style) => styles.findOne({ _id: style.styleId })
        // for some reason we don't have style data in the DPM for certain styles referenced in inventory data
        .then((styleData) => {
            if (!styleData || !styleData.ats || styleData.isOutlet) return null;
            return productApiRequest(params, `/inventory/ats/${styleData._id}`)
              .then((styleAts) => {
                return {
                    isAvailableToSell: styleAts.ats > 0,
                    isOnlineAvailableToSell: styleAts.onlineAts > 0,
                    objectID: styleData._id
                };
            })
            .catch(originalError => {
                return createError.updateAlgoliaInventory.failedToGetApiResponse(originalError, styleData._id);
            });
        })
        .catch(originalError => {
            return createError.updateAlgoliaInventory.failedToGetStyle(originalError, style);
        })
    )))
    .catch(originalError => {
        throw createError.updateAlgoliaInventory.failedToGetStyleAtsData(originalError, stylesToCheck);
    });

    const recordsWithError = styleAvailabilitiesToBeSynced.filter(rec => rec instanceof Error);
    if (recordsWithError.length > 0) {
        log(createError.updateAlgoliaInventory.failedRecords(null, recordsWithError.length, recordsWithError.length), "ERROR");
        recordsWithError.forEach(originalError => {
            log(createError.updateAlgoliaInventory.failedRecord(originalError), "ERROR");
        });
    }

    let recordsToUpdate = styleAvailabilitiesToBeSynced.filter((record) => record && !(record instanceof Error));

    if (recordsToUpdate.length) {
        return index.partialUpdateObjects(recordsToUpdate, true)
            .then(() => styleAvailabilityCheckQueue.deleteMany({ _id: { $in: styleIds } })
              .catch(originalError => {
                  throw createError.updateAlgoliaInventory.failedToRemoveFromQueue(originalError, styleIds);
              }))
            .then(() => updateAlgoliaInventoryCount.insert({ batchSize: styleAvailabilitiesToBeSynced.length }))
            .then(() => console.log('Updated availability for styles ', styleIds))
            .catch((error) => {
                log('Failed to send styles to Algolia.', "ERROR");
                log(params.messages, "ERROR");
                return { error };
            });
    } else {
        return styleAvailabilityCheckQueue.deleteMany({ _id: { $in: styleIds } })
          .catch(originalError => {
              throw createError.updateAlgoliaInventory.failedToRemoveFromQueue(originalError, styleIds);
          });
    }
}

module.exports = global.main;
