const algoliasearch = require('algoliasearch');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { addErrorHandling, log } = require('../utils');
const { MICROSITE } = require('../../lib/constants');

let client = null;
let index = null;

/**
 * Helper for transforming update queue requests to Algolia updates
 * @param {array} facetUpdatesByStyle - queue updates aggregated by style ID
 * @param {mongoDbCollection} styles - handle to the mongo db collection for styles
 * @return {Promise<Array>>} - array where the first element is failures and second is succesful transforms
 */
const transformUpdateQueueRequestToAlgoliaUpdates = async (facetUpdatesByStyle, styles) => {
  let ignoredStyleIds = []
  let algoliaUpdatesWithoutOutlet = await Promise.all(facetUpdatesByStyle.map(addErrorHandling(async (styleFacetUpdateData) => styles.findOne({ _id: styleFacetUpdateData._id })
    .then((currentMongoStyleData) => {
      if ((currentMongoStyleData && currentMongoStyleData.isOutlet) || !currentMongoStyleData || !styleFacetUpdateData._id) { 
        if (styleFacetUpdateData._id) {
          ignoredStyleIds.push(styleFacetUpdateData._id)
        }
        return null;
      }

      const algoliaUpdate = {
        objectID: styleFacetUpdateData._id
      };

      styleFacetUpdateData.facets.forEach((facetData) => {
        // DPM01 / microsites is an array of values. thus we add and delete values differently for it
        if (facetData.type === 'DPM01') {
          algoliaUpdate[facetData.name] = currentMongoStyleData[facetData.name] || {};
          if (facetData.isMarkedForDeletion) {
            delete algoliaUpdate[facetData.name][facetData.facetId]
          } else {
            algoliaUpdate[facetData.name][facetData.facetId] = facetData.value
          }

          return;
        }

        algoliaUpdate[facetData.name] = facetData.isMarkedForDeletion
          ? { en: null, fr: null }
          : facetData.value;
      });

      return algoliaUpdate;
    })
  )));

  const failedTransforms = algoliaUpdatesWithoutOutlet
    .filter((result) => result instanceof Error);

  const successfulTransforms = algoliaUpdatesWithoutOutlet
    .filter((result) => !(result instanceof Error))
    .filter((result) => result);

  return [failedTransforms, successfulTransforms, ignoredStyleIds];
};

/**
 * Uses the array of Algolia updates to generate mongo style collection updates
 * @param {array} algoliaUpdatesWithoutOutlet - output of transformUpdateQueueRequestToAlgoliaUpdates
 * @return {array} - updates for mongo
 */
const generateStyleUpdatesFromAlgoliaUpdates = (algoliaUpdatesWithoutOutlet) => {
  return algoliaUpdatesWithoutOutlet.map((algoliaUpdate) => {
    const styleUpdate = { _id: algoliaUpdate.objectID, ...algoliaUpdate };
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

const transformMicrositeAlgoliaRequests = (algoliaUpdatesWithoutOutlet) => {
  return algoliaUpdatesWithoutOutlet.map((algoliaUpdate) => {
    if (algoliaUpdate[MICROSITE]) {
      return { ...algoliaUpdate, [MICROSITE]: Object.values(algoliaUpdate[MICROSITE]) }
    }
    return algoliaUpdate;
  });
}

global.main = async function (params) {
  log(JSON.stringify({
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
    { $match: { processed: { $ne: true } } },
    { $group: {
      _id: "$styleId",
      facets: { $push: { id: "$_id", name: "$facetName", value: "$facetValue", type: "$typeId", isMarkedForDeletion: "$isMarkedForDeletion", facetId: "$facetId" } }
    }},
    { $limit: 750 }
  ],
  { allowDiskUse: true }
  ).toArray();

  if (!facetUpdatesByStyle.length) {
    return;
  }

  const [failures, algoliaUpdatesWithoutOutlet, ignoredStyleIds] = await transformUpdateQueueRequestToAlgoliaUpdates(facetUpdatesByStyle, styles);

  const styleUpdates = generateStyleUpdatesFromAlgoliaUpdates(algoliaUpdatesWithoutOutlet);

  const updatedStyleIds = algoliaUpdatesWithoutOutlet.map((algoliaUpdate) => algoliaUpdate.objectID);
  const transformedAlgoliaUpdates = transformMicrositeAlgoliaRequests(algoliaUpdatesWithoutOutlet);

  const ignoredFacetUpdateIds = facetUpdatesByStyle
    .filter(({ _id }) => ignoredStyleIds.includes(_id))
    .reduce(( ids, { facets }) => ids.concat(facets.map(({ id }) => id)), []);
  const processedFacetUpdateIds = facetUpdatesByStyle
    .filter(({ _id }) => updatedStyleIds.includes(_id))
    .reduce(( ids, { facets }) => ids.concat(facets.map(({ id }) => id)), []);

  await index.partialUpdateObjects(transformedAlgoliaUpdates, true)
    // mongo will throw an error on bulkWrite if styleUpdates is empty, and then we don't mark as processed from the queue and it gets stuck
    .then(() => styleUpdates.length > 0 ? styles.bulkWrite(styleUpdates, { ordered : false }) : null) 
    .then(() => Promise.all([
      algoliaFacetBulkImportQueue.updateMany({
        _id: { $in:  processedFacetUpdateIds }
      }, {
        $set: {
          processed: true
        }
      }),
      algoliaFacetBulkImportQueue.updateMany({
        _id: { $in:  ignoredFacetUpdateIds }
      }, {
        $set: {
          processed: true,
          ignored: true
        }
      })
    ]))
    .then(() => updateAlgoliaFacetsCount.insert({ batchSize: transformedAlgoliaUpdates.length }))
    .then(() => {
      log(`updated styles: ${updatedStyleIds}`)
      log(`ignored styles: ${ignoredStyleIds}`)
    });

  if (failures.length) {
    throw createError.updateAlgoliaFacets.failedTransforms(failures);
  }
  
  // delete messages older than three months to avoid algoliaFacetBulkImportQueue collection getting too big
  await algoliaFacetBulkImportQueue.deleteMany({
    lastModifiedInternal: {
      $lt: new Date(new Date().getTime() - 4 * 30 * 24 * 60 * 60 * 1000)
    }
  })
};

module.exports = {
  main: global.main,
  transformUpdateQueueRequestToAlgoliaUpdates,
  generateStyleUpdatesFromAlgoliaUpdates,
  transformMicrositeAlgoliaRequests
};
