const createError = require('../../lib/createError');
const { log, createLog, addErrorHandling, addLoggingToMain, passDown } = require('../utils');
const { parseFacetMessage } = require('../../lib/parseFacetMessage');
const getCollection = require('../../lib/getCollection');
const { PROMO_STICKER } = require('../../lib/constants');

const parseFacetMessageWithErrorHandling = addErrorHandling(
    parseFacetMessage,
    createError.addFacetsToBulkImportQueue.failedParseMessage
);

const updateAlgoliaFacetQueue = (algoliaFacetQueue, existingStyles) => async (facetData) => {
    const currStyle = existingStyles.findOne({ id: facetData.styleId })

    // === false because not all styles have isReturnable set so may return undefined
    if (currStyle.isReturnable === false && facetData.facetName === PROMO_STICKER) {
        throw new Error("Cannot update promo sticker on non returnable items")
    }
    
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

    let existingStyles = getCollection({...params, collectionName: "styles"})

    return Promise.all(params.messages
        .map(parseFacetMessageWithErrorHandling)
        .map(updateAlgoliaFacetQueueWithErrorHandling(algoliaFacetQueue, existingStyles))
    )
    .then(passDown({}));
}

global.main = addLoggingToMain(main);

module.exports = global.main;
