/***
 * Listens for messages from Event Streams about the sale price of a style.
 */
const {
    filterPriceMessages,
    parsePriceMessage,
    IN_STORE_SITE_ID,
    ONLINE_SITE_ID
} = require('../lib/parsePriceMessage');

let client = null;
let index = null;

function generateUpdateFromParsedMessage(priceData) {
    const updateToProcess = {
        objectID: priceData.styleId
    };
    switch (priceData.siteId) {
        case ONLINE_SITE_ID:
            updateToProcess.onlineSalePrice = priceData.newRetailPrice;
            break;
        case IN_STORE_SITE_ID:
        default:
            updateToProcess.inStoreSalePrice = priceData.newRetailPrice;
            break;
    }
    return updateToProcess;
}

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

    return index.partialUpdateObjects(params.messages
        .filter(filterPriceMessages)
        .map(parsePriceMessage)
        .map(generateUpdateFromParsedMessage)
    ).catch((error) => {
        console.error('Failed to send prices to Algolia.');
        console.error(params.messages);
        throw error;
    });
};

module.exports = global.main;
