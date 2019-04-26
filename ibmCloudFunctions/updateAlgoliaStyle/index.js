const algoliasearch = require('algoliasearch');
const parseStyleMessage = require('../lib/parseStyleMessage');

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

    const updatedRecords = params.messages
        .filter((msg) => msg.topic === params.topicName)
        .map((msg) => parseStyleMessage(msg))
        .map((style) => { return { ...style , objectID: style.styleId }; });

    return new Promise((resolve) => {
        index.partialUpdateObjects(updatedRecords, true, (err) => {
            if (err) {
                throw new Error('Failed to update Algolia records: ' + err)
            }

            resolve();
        });
    });
}

module.exports = global.main;
