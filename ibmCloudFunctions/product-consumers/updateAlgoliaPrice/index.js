/***
 * Listens for messages from Event Streams about the sale price of a style.
 */
const algoliasearch = require('algoliasearch');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { createLog, addErrorHandling, log } = require('../utils');
const { extractStyleId, getPriceInfo, findApplicablePriceChanges, findUnprocessedStyleIds, markProcessedChanges, markFailedChanges } = require('./utils.js');

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
    
    // In addition to being called as a step of the update-pricing-sequence,
    // this function can also called by a periodic trigger with no messages passed to it
    // in order to process price changes which were not applicable immediately after update-pricing-sequence was run.
    // (Note that price changes won't be applicable immediately if they have a start date or end date that is in future.)
    // Here, we find the messages which initially were not processed, but now can be processed since their startDate or endDate has arrived.
    const processingDate = new Date()
    const styleIds = params.messages && params.messages.length
        ? params.messages.map(addErrorHandling(extractStyleId))
        : await findUnprocessedStyleIds(pricesCollection, processingDate)

    let updates = await Promise.all(styleIds
        .map(addErrorHandling(async (styleId) => {
            const [prices, style] = await Promise.all([
                pricesCollection.findOne({ styleId }),
                stylesCollection.findOne({ _id: styleId })
            ])
            const priceChanges = prices && prices.priceChanges || []
            const originalPrice = style && style.originalPrice || 0
            const applicablePriceChanges = findApplicablePriceChanges(priceChanges)
            const priceInfo = getPriceInfo(originalPrice, applicablePriceChanges)
            await pricesCollection.update({ styleId }, { $set: priceInfo })
            const algoliaUpdatePayload = {
                objectID: styleId,
                ...priceInfo
            }
            return algoliaUpdatePayload
        }))
    );

    const messageFailures = [];
    const failureIndexes = []
    updates = updates.filter((update, index) => {
        if (!update) {
            return false
        }
        if ((update instanceof Error)) {
            messageFailures.push(update)
            failureIndexes.push(index)
            return false
        }
        return true
    });

    let algoliaUpdateResult
    if (updates.length > 0) {
        algoliaUpdateResult = await index.partialUpdateObjects(updates)
            .then(() => updateAlgoliaPriceCount.insert({ batchSize: updates.length }))
            .catch((error) => {
                log.error('Failed to send prices to Algolia.');
                return { error };
        });
    }

    const algoliaUpdateError = algoliaUpdateResult ? algoliaUpdateResult.error : undefined

    if (!algoliaUpdateError) {
        // We mark the price changes that were successfully processed as well as those that failed to process,
        // so that in the next run we don't reprocess them
        await Promise.all([
            markProcessedChanges(pricesCollection, processingDate, styleIds.filter((_, index) => !failureIndexes.includes(index))),
            markFailedChanges(pricesCollection, processingDate, styleIds.filter((_, index) => failureIndexes.includes(index))),
        ])
    }


    const error = (algoliaUpdateError || messageFailures.length)
        ? {
            messageFailures,
            algoliaUpdateError
        }
        : undefined

    if (error) {
        log.error(error)
    }

    return {
        counts: {
            styleIds: styleIds.length,
            successes: styleIds.length - failureIndexes.length,
            failures: failureIndexes.length
        },
        error,
        styleIds,
        failureIndexes
    };
};

module.exports = global.main;
