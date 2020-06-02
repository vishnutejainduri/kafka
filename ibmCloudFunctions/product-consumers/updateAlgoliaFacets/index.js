const algoliasearch = require('algoliasearch');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');

let client = null;
let index = null;

/**
 * Helper for transforming update queue requests to Algolia updates
 * @param {array} facetUpdatesByStyle - queue updates aggregated by style ID
 * @param {mongoDbCollection} styles - handle to the mongo db collection for styles
 * @return {Promise<array>} - array of updates for Algolia
 */
const transformUpdateQueueRequestToAlgoliaUpdates = async (facetUpdatesByStyle, styles) => {
  let algoliaUpdatesWithoutOutlet = await Promise.all(facetUpdatesByStyle.map((styleFacetUpdateData) => styles.findOne({ _id: styleFacetUpdateData._id })
    .then((currentMongoStyleData) => {
      if (currentMongoStyleData && !currentMongoStyleData.isOutlet) {
        const algoliaUpdate = {
          objectID: styleFacetUpdateData._id
        };

        styleFacetUpdateData.facets.forEach((facetData) => {
          // DPM01 / microsites is an array of values. thus we add and delete values differently for it
          if (facetData.type === 'DPM01') {
            algoliaUpdate[facetData.name] = currentMongoStyleData[facetData.name] || [];
            algoliaUpdate[facetData.name] = facetData.isMarkedForDeletion
              ? algoliaUpdate[facetData.name].filter((currentMongoFacet) =>
                !(currentMongoFacet.en === facetData.value.en && currentMongoFacet.fr === facetData.value.fr))
              : currentMongoStyleData[facetData.name].concat([facetData.value]);
            return;
          }

          algoliaUpdate[facetData.name] = facetData.isMarkedForDeletion
            ? { en: null, fr: null }
            : facetData.value;
        });
        return algoliaUpdate;
      } else {
        return null;
      }
    })
  ));

  return algoliaUpdatesWithoutOutlet.filter((algoliaUpdate) => algoliaUpdate);
};

/**
 * Uses the array of Algolia updates to generate mongo style collection updates
 * @param {array} algoliaUpdatesWithoutOutlet - output of transformUpdateQueueRequestToAlgoliaUpdates
 * @return {array} - updates for mongo
 */
const generateStyleUpdatesFromAlgoliaUpdates = (algoliaUpdatesWithoutOutlet) => {
  return algoliaUpdatesWithoutOutlet.map((algoliaUpdate) => {
    const styleUpdate = Object.assign({}, algoliaUpdate);
    styleUpdate._id = algoliaUpdate.objectID;
    delete styleUpdate.objectID;

    return {
      updateOne :
        {
          "filter" : { _id : styleUpdate._id },
          "update" : { $currentDate: { lastModifiedInternalFacets: { $type:"timestamp" } }, $set : styleUpdate },
          "upsert": true
        }
    };
  });
};

global.main = async function (params) {
    console.log(JSON.stringify({
        cfName: 'updateAlgoliaFacets',
        params
    }));

    if (!params.algoliaIndexName || !params.algoliaApiKey || !params.algoliaAppId) {
        throw new Error('Requires Algolia configuration. See manifest.yml');
    }

    if (index === null) {
        client = algoliasearch(params.algoliaAppId, params.algoliaApiKey);
        client.setTimeouts({
            connect: 600000,
            read: 600000,
            write: 600000
        });
        index = client.initIndex(params.algoliaIndexName);
    }
    let algoliaFacetBulkImportQueue;
    let styles;
    let updateAlgoliaFacetsCount;
    try {
        algoliaFacetBulkImportQueue = await getCollection(params);
        styles = await getCollection(params, params.stylesCollectionName);
        updateAlgoliaFacetsCount = await getCollection(params, 'updateAlgoliaFacetsCount');
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    const facetUpdatesByStyle = await algoliaFacetBulkImportQueue.aggregate([
        { $group: {
            _id: "$styleId",
            facets: { $push: { name: "$facetName", value: "$facetValue", type: "$typeId", isMarkedForDeletion: "$isMarkedForDeletion" } }
        }},
        { $limit: 750 }
    ],
    { allowDiskUse: true }
    ).toArray();

    if (!facetUpdatesByStyle.length) {
        return;
    }

    const algoliaUpdatesWithoutOutlet = await transformUpdateQueueRequestToAlgoliaUpdates(facetUpdatesByStyle, styles);

    const styleUpdates = generateStyleUpdatesFromAlgoliaUpdates(algoliaUpdatesWithoutOutlet);

    const styleIds = algoliaUpdatesWithoutOutlet.map((algoliaUpdate) => algoliaUpdate.objectID);

    return index.partialUpdateObjects(algoliaUpdatesWithoutOutlet, true)
        .then(() => styles.bulkWrite(styleUpdates, { ordered : false })
        .then(() => algoliaFacetBulkImportQueue.deleteMany({ styleId: { $in: styleIds } }))
        .then(() => updateAlgoliaFacetsCount.insert({ batchSize: algoliaUpdatesWithoutOutlet.length }))
        .then(() => console.log('updated styles', styleIds)));
}

module.exports = {
  main: global.main,
  transformUpdateQueueRequestToAlgoliaUpdates,
  generateStyleUpdatesFromAlgoliaUpdates
};
