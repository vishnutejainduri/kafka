const createError = require('../../lib/createError');
const { log, createLog, addErrorHandling } = require('../utils');
const { parseFacetMessage } = require('../../lib/parseFacetMessage');
const getCollection = require('../../lib/getCollection');

const parseFacetMessageWithErrorHandling = addErrorHandling(
    parseFacetMessage,
    createError.addFacetsToBulkImportQueue.failedParseMessage
);

const updateAlgoliaFacetQueue = algoliaFacetQueue => (facetData) => {
    return algoliaFacetQueue.updateOne({ _id: facetData._id }, { $set: facetData }, { upsert: true })
        .catch((err) => {
            console.error('Problem with facet ' + facetData._id);
            console.error(err);
            if (!(err instanceof Error)) {
                const e = new Error();
                e.originalError = err;
                e.attemptedDocument = facetData;
                return e;
            }

            err.attemptedDocument = facetData;
            return err;
        })
};

const updateAlgoliaFacetQueueWithErrorHandling = algoliaFacetQueue => addErrorHandling(
    updateAlgoliaFacetQueue(algoliaFacetQueue),
    createError.addFacetsToBulkImportQueue.failedUpdateFacetQueue
);

global.main = async function (params) {
    log(createLog.params("addFacetsToBulkImportQueue", params));

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    const algoliaFacetQueue = await getCollection(params)
        .catch(originalError => {
            throw createError.failedDbConnection(originalError, null, params);
        });

    return Promise.all(params.messages
        .map(parseFacetMessageWithErrorHandling)
        .map(updateAlgoliaFacetQueueWithErrorHandling(algoliaFacetQueue))
    ).then((results) => {
        const messageFailures = results.filter((res) => res instanceof Error);
        if (messageFailures.length >= 1) {
            throw createError.addFacetsToBulkImportQueue.partialFailure(params.messages, messageFailures);
        }
    });
}

module.exports = global.main;
