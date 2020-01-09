const algoliasearch = require('algoliasearch');
const getCollection = require('../../lib/getCollection');

let client = null;
let index = null;

global.main = async function (params) {
    console.log(JSON.stringify({
        cfName: 'updateAlgoliaInventory',
        params
    }));

    if (!params.algoliaIndexName || !params.algoliaApiKey || !params.algoliaAppId) {
        throw new Error('Requires Algolia configuration. See manifest.yml');
    }

    if (index === null) {
        client = algoliasearch(params.algoliaAppId, params.algoliaApiKey);
        index = client.initIndex(params.algoliaIndexName);
    }

    const styleAvailabilityCheckQueue = await getCollection(params);
    const styles = await getCollection(params, params.stylesCollectionName);
    const updateAlgoliaInventoryCount = await getCollection(params, 'updateAlgoliaInventoryCount');
    const stylesToCheck = await styleAvailabilityCheckQueue.find().limit(200).toArray();
    const styleIds = stylesToCheck.map((style) => style.styleId);

    let styleAvailabilitiesToBeSynced = await Promise.all(stylesToCheck.map((style) => styles.findOne({ _id: style.styleId })
        // for some reason we don't have style data in the DPM for certain styles referenced in inventory data
        .then((styleData) => {
            return !styleData || !styleData.sizes || styleData.isOutlet
                ? null
                : {
                    isSellable: !!styleData.sizes.length,
                    sizes: styleData.sizes,
                    objectID: styleData._id
                };
        })
    ));
    styleAvailabilitiesToBeSynced = styleAvailabilitiesToBeSynced.filter((styleData) => styleData);
    if (styleAvailabilitiesToBeSynced.length) {
        return index.partialUpdateObjects(styleAvailabilitiesToBeSynced, true)
            .then(() => styleAvailabilityCheckQueue.deleteMany({ _id: { $in: styleIds } }))
            .then(() => updateAlgoliaInventoryCount.insert({ batchSize: styleAvailabilitiesToBeSynced.length }))
            .then(() => log('Updated availability for styles ', styleIds))
            .catch((error) => {
                log('Failed to send styles to Algolia.', "ERROR");
                log(params.messages, "ERROR");
                return { error };
            });
    } else {
        console.log('No updates to process.');
        return styleAvailabilityCheckQueue.deleteMany({ _id: { $in: styleIds } });
    }
}

module.exports = global.main;
