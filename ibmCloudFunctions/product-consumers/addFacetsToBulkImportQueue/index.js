const createError = require('../../lib/createError');
const { log, createLog, addErrorHandling, addLoggingToMain, passDown } = require('../utils');
const { parseFacetMessage } = require('../../lib/parseFacetMessage');
const { messageIncludesStickerForNonReturnableStyle } = require('./utils')
const getCollection = require('../../lib/getCollection');

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

const main = async function (params) {
    log(createLog.params("addFacetsToBulkImportQueue", params));

    let algoliaFacetQueue;
    let styles
    try {
        algoliaFacetQueue = await getCollection(params);
        styles = await getCollection(params, params.stylesCollectionName)
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    return Promise.all(params.messages
        .map(addErrorHandling(parseFacetMessage))
        .filter(addErrorHandling(messageIncludesStickerForNonReturnableStyle(styles)))
        .map(addErrorHandling(updateAlgoliaFacetQueue(algoliaFacetQueue)))
    )
    .then(passDown({}));
}

global.main = addLoggingToMain(main);

module.exports = global.main;
