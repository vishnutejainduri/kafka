const algoliasearch = require('algoliasearch');

const { createLog, addErrorHandling, log } = require('../utils');
const { parseStyleMessage, filterStyleMessages } = require('../../lib/parseStyleMessage');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');

let client = null;
let index = null;

global.main = async function (params) {
    log(createLog.params('updateAlgoliaStyle', params));

    if (!params.algoliaIndexName) {
        throw new Error('Requires an Algolia index.');
    }

    if (!params.algoliaApiKey) {
        throw new Error('Requires an API key for writing to Algolia.');
    }

    if (!params.algoliaAppId) {
        throw new Error('Requires an App ID for writing to Algolia.');
    }

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
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

    const styles = await getCollection(params)
        .catch(originalError => {
            throw createError.failedDbConnection(originalError, params && params.collectionName);
        });

    const updateAlgoliaStyleCount = await getCollection(params, 'updateAlgoliaStyleCount')
        .catch(originalError => {
            throw createError.failedDbConnection(originalError, 'updateAlgoliaStyleCount');
        });

    let records = await Promise.all(params.messages
        .filter(addErrorHandling(filterStyleMessages))
        .map(addErrorHandling(parseStyleMessage))
        // Add Algolia object ID
        .map(addErrorHandling((styleData) => {
            styleData.objectID = styleData.id;
            return styleData;
        }))
        // We should run the update if there's no existing doc or the update is newer than existing
        .map(addErrorHandling(async (styleData) => {
            const existingDoc = await styles.findOne({_id: styleData._id}, { ats:0, onlineAts:0 });
            return !existingDoc || ((existingDoc.effectiveDate <= styleData.effectiveDate) && !existingDoc.isOutlet)
                ? styleData
                : null;
        }))
    );

    const recordsWithError = records.filter(rec => rec instanceof Error);
    if (recordsWithError.length > 0) {
        log(createError.updateAlgoliaStyle.failedRecords(null, recordsWithError.length, records.length), "ERROR");
        recordsWithError.forEach(originalError => {
            log(createError.updateAlgoliaStyle.failedRecord(originalError), "ERROR");
        });
    }

    const recordsToUpdate = records.filter((record) => record && !(record instanceof Error));

    if (recordsToUpdate.length) {
        return index.partialUpdateObjects(recordsToUpdate, true)
            .then(async () => {
                const result = await updateAlgoliaStyleCount.insert({ batchSize: recordsToUpdate.length });
                return Object.assign({}, params, result);
            })
            .catch((error) => {
                log('Failed to send styles to Algolia.', "ERROR");
                error.params = params;
                throw error;
            });
    }
}

module.exports = global.main;
