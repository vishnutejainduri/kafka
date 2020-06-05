/***
 * Listens for messages from Event Streams about the sale price of a style.
 */
const algoliasearch = require('algoliasearch');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { createLog, addErrorHandling, log } = require('../utils');
const { extractStyleId, getPriceInfo, findApplicablePriceChanges } = require('./utils.js');

let client = null;
let index = null;

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

    let stylesCollection;
    let pricesCollection;
    let updateAlgoliaPriceCount;
    try {
        stylesCollection = await getCollection(params);
        pricesCollection = await getCollection(params, params.pricesCollectionName);
        updateAlgoliaPriceCount = await getCollection(params, 'updateAlgoliaPriceCount');
    } catch (originalError) {
        throw createError.failedDbConnection(originalError); 
    }

    let updates = await Promise.all(params.messages
        .map(addErrorHandling(extractStyleId))
        .map(addErrorHandling(async (styleId) => {
            const [prices, style] = await Promise.all([
                pricesCollection.findOne({ styleId }),
                stylesCollection.findOne({ _id: styleId })
            ])
            const priceChanges = prices && prices.priceChanges || []
            const originalPrice = style && style.originalPrice || 0
            const applicablePriceChanges = findApplicablePriceChanges(priceChanges)
            return getPriceInfo(originalPrice, applicablePriceChanges)
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
