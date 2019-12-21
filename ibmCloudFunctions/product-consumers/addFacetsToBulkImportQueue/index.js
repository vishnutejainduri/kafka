const createError = require('../../lib/createError');
const { log, createLog, addErrorHandling } = require('../utils');
const { parseFacetMessage } = require('../../lib/parseFacetMessage');
const getCollection = require('../../lib/getCollection');
const storeMessages = require('../../lib/storeMessages');

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
    try {
        log(await storeMessages(
            {
                ...params,
                mongoUri: params.messagesMongoUri,
            },
            {
                activationId: process.env.__OW_ACTIVATION_ID,
                messages: params.messages
            }
        ));
    } catch (error) {
        log(createLog.failedToStoreMessages(error));
    }

    let algoliaFacetQueue;
    try {
        algoliaFacetQueue = await getCollection(params);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    return Promise.all(params.messages
        .map(parseFacetMessageWithErrorHandling)
        .map(updateAlgoliaFacetQueueWithErrorHandling(algoliaFacetQueue))
    ).then((results) => {
        const messageFailures = results.filter((res) => res instanceof Error);
        if (messageFailures.length >= 1) {
            throw createError.addFacetsToBulkImportQueue.partialFailure(params.messages, messageFailures);
        } else {
            return {
                results
            };
        }
    });
}

module.exports = global.main;
