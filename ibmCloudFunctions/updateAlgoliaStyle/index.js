const algoliasearch = require('algoliasearch');
const { parseStyleMessage, filterStyleMessages } = require('../lib/parseStyleMessage');
const getCollection = require('../lib/getCollection');
const { productApiRequest } = require('../lib/productApi');

let client = null;
let index = null;

global.main = async function (params) {
    if (!params.algoliaIndexName) {
        throw new Error('Requires an Algolia index.');
    }

    if (!params.algoliaApiKey) {
        throw new Error('Requires an API key for writing to Algolia.');
    }

    if (!params.algoliaAppId) {
        throw new Error('Requires an App ID for writing to Algolia.');
    }

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (index === null) {
        client = algoliasearch(params.algoliaAppId, params.algoliaApiKey);
        index = client.initIndex(params.algoliaIndexName);
    }

    const styles = await getCollection(params);
    return Promise.all(params.messages
        .filter((msg) => msg.topic === params.topicName)
        .filter(filterStyleMessages)
        .map(parseStyleMessage)
        // Add Algolia object ID
        .map((styleData) => {
            styleData.objectID = styleData.id;
            return styleData;
        })
        // We should run the update if there's no existing doc or the update is newer than existing
        .map(async (styleData) => {
            const existingDoc = await styles.findOne({_id: styleData._id});
            return !existingDoc || (existingDoc.effectiveDate < styleData.effectiveDate)
                ? styleData
                : null;
        })
        .filter((styleData) => styleData)
        .map(async (styleData) => {
            const imageMedia = await productApiRequest(params, { path: `/media/${styleData._id}/main`});
            if (imageMedia && imageMedia.data) {
                const thumbnail = imageMedia.data[0].images.find((image) => image.qualifier === 'HRSTORE');
                if (thumbnail) {
                    styleData.image = thumbnail.url;
                }
            }
            return styleData;
        })
    ).then((recordsToUpdate) => index.partialUpdateObjects(recordsToUpdate, true))
    .catch((error) => {
        console.error('Failed to send styles to Algolia.');
        console.error(params.messages);
        throw error;
    });
}

module.exports = global.main;
