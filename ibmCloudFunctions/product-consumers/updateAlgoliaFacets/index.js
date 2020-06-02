const algoliasearch = require('algoliasearch');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');

let client = null;
let index = null;

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
                    ? currentMongoStyleData[facetData.name].filter((currentMongoFacet) =>
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
    algoliaUpdatesWithoutOutlet = algoliaUpdatesWithoutOutlet.filter((algoliaUpdate) => algoliaUpdate);

    const styleUpdates = algoliaUpdatesWithoutOutlet.map((algoliaUpdate) => {
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

    const styleIds = algoliaUpdatesWithoutOutlet.map((algoliaUpdate) => algoliaUpdate.objectID);


    return index.partialUpdateObjects(algoliaUpdatesWithoutOutlet, true)
        .then(() => styles.bulkWrite(styleUpdates, { ordered : false })
        .then(() => algoliaFacetBulkImportQueue.deleteMany({ styleId: { $in: styleIds } }))
        .then(() => updateAlgoliaFacetsCount.insert({ batchSize: algoliaUpdatesWithoutOutlet.length }))
        .then(() => console.log('updated styles', styleIds)));
}

module.exports = global.main;
