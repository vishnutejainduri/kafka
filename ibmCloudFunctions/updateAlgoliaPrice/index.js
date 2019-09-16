/***
 * Listens for messages from Event Streams about the sale price of a style.
 */
const algoliasearch = require('algoliasearch');
const {
    filterPriceMessages,
    parsePriceMessage,
    IN_STORE_SITE_ID,
    ONLINE_SITE_ID
} = require('../lib/parsePriceMessage');
const getCollection = require('../lib/getCollection');

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
            updateToProcess.inStoreSalePrice = priceData.newRetailPrice;
            break;
        default:
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

    const styles = await getCollection(params);
    const updateAlgoliaPriceCount = await getCollection(params, 'updateAlgoliaPriceCount');
    let updates = params.messages
        .filter(filterPriceMessages)
        .map(parsePriceMessage)
        .map(generateUpdateFromParsedMessage);
    updates = await Promise.all(updates.map(async (update) => {
        // Ensure that the price update is for an available style
        const styleData = await styles.findOne({ _id: update.objectID });
        if (!styleData || styleData.isOutlet) {
            return null;
        }

        update.currentPrice = update.onlineSalePrice || styleData.originalPrice;
        const priceString = update.currentPrice ? update.currentPrice.toString() : '';
        const priceArray = priceString.split('.');
        update.isSale = priceArray.length > 1 ? priceArray[1] === '99' : false;
        return update;
    }));
    updates = updates.filter((update) => update);

    return index.partialUpdateObjects(updates)
      .then(() => updateAlgoliaPriceCount.insert({ batchSize: updates.length }))
      .catch((error) => {
        console.error('Failed to send prices to Algolia.');
        console.error(params.messages);
        throw error;
    });
};

module.exports = global.main;
