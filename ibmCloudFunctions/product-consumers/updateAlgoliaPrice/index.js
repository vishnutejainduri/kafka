/***
 * Listens for messages from Event Streams about the sale price of a style.
 */
const algoliasearch = require('algoliasearch');
const {
    filterPriceMessages,
    parsePriceMessage,
    IN_STORE_SITE_ID,
    ONLINE_SITE_ID
} = require('../../lib/parsePriceMessage');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { createLog, addErrorHandling, log } = require('../utils');

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
    log(createLog.params('updateAlgoliaPrice', params));

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
        try {
            client = algoliasearch(params.algoliaAppId, params.algoliaApiKey);
            client.setTimeouts({
                connect: 600000,
                read: 600000,
                write: 600000
            });
            index = client.initIndex(params.algoliaIndexName);
        }
        catch (originalError) {
            throw createError.failedAlgoliaConnection(originalError);
        }
    }

    let styles;
    let prices;
    let updateAlgoliaPriceCount;
    try {
        styles = await getCollection(params);
        prices = await getCollection(params, params.pricesCollectionName);
        updateAlgoliaPriceCount = await getCollection(params, 'updateAlgoliaPriceCount');
    } catch (originalError) {
        throw createError.failedDbConnection(originalError); 
    }

    let updates = await Promise.all(params.messages
        .filter(addErrorHandling(filterPriceMessages))
        .map(addErrorHandling(parsePriceMessage))
        .map(addErrorHandling(generateUpdateFromParsedMessage))
        .map(addErrorHandling(async (update) => {
            // Ensure that the price update is for an available style
            const styleData = await styles.findOne({ _id: update.objectID });
            const priceData = await prices.findOne({ _id: update.objectID });
            if (!styleData 
                || styleData.isOutlet
                || priceData && (update.onlineSalePrice === priceData.onlineSalePrice && update.inStoreSalePrice === priceData.inStoreSalePrice)) {
                return null;
            }

            update.currentPrice = update.onlineSalePrice || styleData.originalPrice;
            const priceString = update.currentPrice ? update.currentPrice.toString() : '';
            const priceArray = priceString.split('.');
            update.isSale = priceArray.length > 1 ? priceArray[1] === '99' : false;
            return update;
        }))
    );
    
    const messageFailures = [];
    updates = updates.filter((update) => {
        if (!update) {
            return false
        }
        if ((update instanceof Error)) {
            messageFailures.push(update);
            return false;
        }
        return true
    });

    if (updates.length > 0) {
        await index.partialUpdateObjects(updates)
            .then(() => updateAlgoliaPriceCount.insert({ batchSize: updates.length }))
            .catch((error) => {
                console.error('Failed to send prices to Algolia.');
                error.debugInfo = {
                    messageFailures,
                    messages: params.messages
                }
                return { error };
        });
    }

    if (messageFailures.length > 0) {
        throw createError.updateAlgoliaPrice.partialFailure(params.messages, messageFailures);
    }

    return params;
};

module.exports = global.main;
