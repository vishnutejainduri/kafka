const createError = require('../../lib/createError');
const { log, createLog, addErrorHandling, addLoggingToMain, passDownAnyMessageErrors } = require('../utils');
const { parseFacetMessage } = require('../../lib/parseFacetMessage');
const getCollection = require('../../lib/getCollection');

const parseFacetMessageWithErrorHandling = addErrorHandling(
    parseFacetMessage,
    createError.addFacetsToBulkImportQueue.failedParseMessage
);

const updateAlgoliaFacetQueue = algoliaFacetQueue => async (facetData) => {
    return algoliaFacetQueue.insertOne({
        facetValue: {
          en: facetData.facetValue.en,
          fr: facetData.facetValue.fr
        },
        facetName: facetData.facetName,
        styleId: facetData.styleId,
        typeId: facetData.typeId,
        facetId: facetData.facetId,
        isMarkedForDeletion: facetData.isMarkedForDeletion,
        lastModifiedInternal: new Date()
      });
};

const updateAlgoliaFacetQueueWithErrorHandling = algoliaFacetQueue => addErrorHandling(
    updateAlgoliaFacetQueue(algoliaFacetQueue),
    createError.addFacetsToBulkImportQueue.failedUpdateFacetQueue
);

const main = async function (params) {
    log(createLog.params("addFacetsToBulkImportQueue", params));

    let algoliaFacetQueue;
    try {
        algoliaFacetQueue = await getCollection(params);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    return Promise.all(params.messages
        .map(parseFacetMessageWithErrorHandling)
        .map(updateAlgoliaFacetQueueWithErrorHandling(algoliaFacetQueue))
    )
    .then(passDownAnyMessageErrors);
}

global.main = addLoggingToMain(main);

module.exports = global.main;
