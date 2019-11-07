const algoliasearch = require('algoliasearch');
const getCollection = require('../../lib/getCollection');

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
        index = client.initIndex(params.algoliaIndexName);
    }

    const algoliaFacetBulkImportQueue = await getCollection(params);
    const styles = await getCollection(params, params.stylesCollectionName);
    const updateAlgoliaFacetsCount = await getCollection(params, 'updateAlgoliaFacetsCount');
    const styleFacets = await algoliaFacetBulkImportQueue.aggregate([
        { $group: {
            _id: "$styleId",
            facets: { $push: { name: "$facetName", value: "$facetValue" } }
        }},
        { $limit: 750 }
    ]).toArray();

    if (!styleFacets.length) {
        return;
    }

    const algoliaUpdates = styleFacets.map((styleFacetData) => {
        const styleData = {
            objectID: styleFacetData._id
        };
        styleFacetData.facets.forEach((facetData) => {
            styleData[facetData.name] = facetData.value;
        });
        return styleData;
    });

    const styleUpdates = algoliaUpdates.map((algoliaUpdate) => {
        const styleUpdate = Object.assign({}, algoliaUpdate);
        styleUpdate._id = algoliaUpdate.objectID;
        delete styleUpdate.objectID;
        return {
            updateOne :
                {
                    "filter" : { _id : styleUpdate._id },
                    "update" : { $set : styleUpdate },
                    "upsert": true
                }
        };
    });

    const styleIds = algoliaUpdates.map((algoliaUpdate) => algoliaUpdate.objectID);

    let algoliaUpdatesWithoutOutlet = await Promise.all(algoliaUpdates.map((algoliaUpdate) => styles.findOne({ _id: algoliaUpdate.objectID })
        .then((styleData) => {
            return !styleData || styleData.isOutlet
                ? null
                : algoliaUpdate
        })
    ));
    algoliaUpdatesWithoutOutlet = algoliaUpdatesWithoutOutlet.filter((algoliaUpdate) => algoliaUpdate);

    return index.partialUpdateObjects(algoliaUpdatesWithoutOutlet, true)
        .then(() => styles.bulkWrite(styleUpdates, { ordered : false })
        .then(() => algoliaFacetBulkImportQueue.deleteMany({ styleId: { $in: styleIds } }))
        .then(() => updateAlgoliaFacetsCount.insert({ batchSize: algoliaUpdatesWithoutOutlet.length }))
        .then(() => console.log('updated styles', styleIds)));
}

module.exports = global.main;
