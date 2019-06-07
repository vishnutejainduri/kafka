const algoliasearch = require('algoliasearch');
const getCollection = require('../lib/getCollection');

let client = null;
let index = null;

global.main = async function (params) {
    if (!params.algoliaIndexName || !params.algoliaApiKey || !params.algoliaAppId) {
        throw new Error('Requires Algolia configuration. See manifest.yml');
    }

    if (index === null) {
        client = algoliasearch(params.algoliaAppId, params.algoliaApiKey);
        index = client.initIndex(params.algoliaIndexName);
    }

    const styleAvailabilityCheckQueue = await getCollection(params);
    const styles = await getCollection(params, params.stylesCollectionName);
    const stylesToCheck = await styleAvailabilityCheckQueue.find().limit(200).toArray();
    const styleIds = stylesToCheck.map((style) => style.styleId);

    Promise.all(stylesToCheck.map((style) => styles.findOne({ _id: style.styleId })
        .then((styleData) => {
            return {
                isSellable: !!styleData.sizes.length,
                sizes: styleData.sizes,
                objectID: styleData._id
            };
        })
    )).then((styleAvailabilitiesToBeSynced) => index.partialUpdateObjects(styleAvailabilitiesToBeSynced, true))
        .then(() => styleAvailabilityCheckQueue.deleteMany({ _id: { $in: styleIds } }))
        .then(() => console.log('Updated availability for styles ', styleIds));
}

module.exports = global.main;
