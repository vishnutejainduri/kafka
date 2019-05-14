const algoliasearch = require('algoliasearch');
const { parseStyleMessage, filterStyleMessages } = require('../lib/parseStyleMessage');
const getCollection = require('../lib/getCollection');

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
        .map((msg) => parseStyleMessage(msg))
        // Add Algolia object ID
        .map((styleData) => {
            styleData.objectID = styleData.id;
            return styleData;
        })
        .map((styleData) => styles.findOne({ _id: styleData._id })
            // We should run the update if there's no existing doc or the update is newer than existing
            .then((existingDocument) => !existingDocument || (existingDocument.effectiveDate < styleData.effectiveDate) ? styleData : null)
        )
    ).then((recordsToUpdate) => {
        recordsToUpdate = recordsToUpdate.filter((record) => record);
        return index.saveObjects(recordsToUpdate);
    }).catch((error) => {
        console.error('Failed to send styles to Algolia.');
        console.error(params.messages);
        throw error;
    });
}

module.exports = global.main;
