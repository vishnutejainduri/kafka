const algoliasearch = require('algoliasearch');
const { parseStyleMessage, filterStyleMessages } = require('../../lib/parseStyleMessage');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');

let client = null;
let index = null;

const addErrorHandling = fn => {
    if (fn instanceof async) {
        return async arg => {
            if (arg instanceof Error) return arg;
            return fn(arg).catch(error => error);
        }
    }

    return arg => {
        if (arg instanceof Error) return arg;
        try {
            return fn(arg);
        } catch(error) {
            return error;
        }
    };
}


global.main = async function (params) {
    const { messages, ...paramsExcludingMessages } = params;
    const messagesIsArray = Array.isArray(messages);
    console.log(JSON.stringify({
        cfName: 'updateAlgoliaStyle',
        paramsExcludingMessages,
        messagesLength: messagesIsArray ? messages.length : null,
        messages // outputting messages as the last parameter because if it is too long the rest of the log will be truncated in logDNA
    }));

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
            client = algoliasearch(params.algoliaAppId, params.algoliaApiKey)
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
            const existingDoc = await styles.findOne({_id: styleData._id});
            return (!existingDoc || (existingDoc.effectiveDate <= styleData.effectiveDate)) && !existingDoc.isOutlet
                ? styleData
                : null;
        }))
    );

    const recordsWithError = recordsToUpdate.filter(rec => rec instanceof Error);
    if (recordsWithError.length > 0) {
        console.error(createError.updateAlgoliaStyle.failedRecords(null, recordsWithError.length, records.length));
        recordsWithError.forEach(originalError => {
            console.error(createError.updateAlgoliaStyle.failedRecord(originalError))
        });
    }

    recordsToUpdate = records.filter((record) => record && !(record instanceof Error));

    if (recordsToUpdate.length) {
        return index.partialUpdateObjects(recordsToUpdate, true)
            .then(() => updateAlgoliaStyleCount.insert({ batchSize: recordsToUpdate.length }))
            .catch((error) => {
                console.error('Failed to send styles to Algolia.');
                console.error(messages);
                throw error;
            });
    }
}

module.exports = global.main;
