const algoliasearch = require('algoliasearch');
const parseCatalogMessage = require('../lib/parseCatalogMessage');

const client = algoliasearch('CDROBE4GID', 'e46042a457cfc6131bed30aa16aa6c48');
let index = null;

async function main(params) {
    if (!params.algoliaIndexName) {
        throw new Error('Requires an Algolia index.');
    }

    if (!params.algoliaApiKey) {
        throw new Error('Requires an API key for writing to Algolia.');
    }

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (index === null) {
        index = client.initIndex(params.algoliaIndexName);
    }

    const updatedRecords = params.messages
        .filter((msg) => msg.topic === params.topicName)
        .map((msg) => parseCatalogMessage(msg))
        .map((style) => { return { ...style , objectID: style.styleId }; });

    const promise = new Promise();
    index.partialUpdateObjects(updatedRecords, true, (err, content) => {
        if (err) {
            throw new Error('Failed to update Algolia records: ' + err)
        }

        promise.resolve();
    });
    return promise;
}

exports.main = main;
