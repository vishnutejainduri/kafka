const algoliasearch = require('algoliasearch');

const { createLog, addErrorHandling, log, addLoggingToMain, passDownAnyMessageErrors } = require('../utils');
const { parseStyleMessage, filterStyleMessages } = require('../../lib/parseStyleMessage');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');

let client = null;
let index = null;

const main = async function (params) {
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

    let styles;
    let updateAlgoliaStyleCount;
    try {
        styles = await getCollection(params);
        updateAlgoliaStyleCount = await getCollection(params, 'updateAlgoliaStyleCount');
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    let records = await Promise.all(params.messages
        .map(addErrorHandling(msg => filterStyleMessages(msg) ? msg : null))
        .map(addErrorHandling(parseStyleMessage))
        // Add Algolia object ID
        .map(addErrorHandling((styleData) => {
            styleData.objectID = styleData.id;
            return styleData;
        }))
        // We should run the update if there's no existing doc or the update is newer than existing
        .map(addErrorHandling(async (styleData) => {
            const existingDoc = await styles.findOne({_id: styleData._id}, { ats:0, onlineAts:0 });
            return !existingDoc || ((existingDoc.lastModifiedDate <= styleData.lastModifiedDate || !existingDoc.lastModifiedDate) && !existingDoc.isOutlet)
                ? styleData
                : null;
        }))
    );

    const recordsToUpdate = records.filter((record) => record && !(record instanceof Error));

    if (recordsToUpdate.length) {
        // if we fail to update algolia, the whole batch has to be retried
        await index.partialUpdateObjects(recordsToUpdate, true);
        await updateAlgoliaStyleCount.insert({ batchSize: recordsToUpdate.length }).catch(() => { log('Failed to update batch count.') })
    }

    return passDownAnyMessageErrors(records)
}

global.main = addLoggingToMain(main)
module.exports = global.main;
