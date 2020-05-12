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

    const styleFacets = await algoliaFacetBulkImportQueue.aggregate([
        { $group: {
            _id: "$styleId",
            facets: { $push: { name: "$facetName", value: "$facetValue", type: "$typeId" } }
        }},
        { $limit: 750 }
    ],
    { allowDiskUse: true }
    ).toArray();

    if (!styleFacets.length) {
        return;
    }

    let algoliaUpdatesWithoutOutlet = await Promise.all(styleFacets.map((styleFacetData) => styles.findOne({ _id: styleFacetData._id })
        .then((styleData) => {
            if (styleData && !styleData.isOutlet) {
              const algoliaUpdate = {
                  objectID: styleFacetData._id
              };
              styleFacetData.facets.forEach((facetData) => {
                  if (facetData.type === 'DPM01') {
                    algoliaUpdate[facetData.name] = styleData[facetData.name] ? styleData[facetData.name].concat([facetData.value]) : [facetData.value]
                  } else {
                    algoliaUpdate[facetData.name] = facetData.value;
                  }
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
