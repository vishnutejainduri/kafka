const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { createLog, addErrorHandling, log } = require('../utils');
const {
  extractStyleId,
  findApplicablePriceChanges,
  findUnprocessedStyleIds,
  markProcessedChanges,
  markFailedChanges
} = require('../updateAlgoliaPrice/utils.js');

// CT related requires
const { updateStylePermanentMarkdown } = require('./utils');
const messagesLogs = require('../../lib/messagesLogs');
const getCtHelpers = require('../../lib/commercetoolsSdk');

// Holds two CT helpers, including the CT client. It's declared outside of
// `main` so the same client can be shared between warm starts.
let ctHelpers;

global.main = async function (params) {
    log(createLog.params('updateCTSalePrice', params));
    const { productTypeId } = params;

    if (!ctHelpers) {
      ctHelpers = getCtHelpers(params);
    }

    let stylesCollection;
    let pricesCollection;
    try {
        stylesCollection = await getCollection(params);
        pricesCollection = await getCollection(params, params.pricesCollectionName);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError); 
    }
    
    const processingDate = new Date()
    const styleIds = await findUnprocessedStyleIds(pricesCollection, processingDate, 'CT')

    let updates = await Promise.all(styleIds
        .map(addErrorHandling(async (styleId) => {
            const [prices, style] = await Promise.all([
                pricesCollection.findOne({ styleId }),
                stylesCollection.findOne({ _id: styleId })
            ])
            const priceChanges = prices && prices.priceChanges || []
            const originalPrice = style && style.originalPrice || 0
            const applicablePriceChanges = findApplicablePriceChanges(priceChanges)
            const styleUpdate = updateStylePermanentMarkdown(ctHelpers, productTypeId, applicablePriceChanges)
            return styleUpdate;
        }))
    );
    console.log('updates', updates);

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

    let CTUpdateResult
    if (updates.length > 0) {
        CTUpdateResult = await Promise.all(updates)
            .catch((error) => {
                log.error('Failed to send prices to CT');
                return { error };
        });
    }
    console.log('CTUpdateResult', CTUpdateResult);

    /*const algoliaUpdateError = algoliaUpdateResult ? algoliaUpdateResult.error : undefined

    if (!algoliaUpdateError) {
        // We mark the price changes that were successfully processed as well as those that failed to process,
        // so that in the next run we don't reprocess them
        await Promise.all([
            markProcessedChanges(pricesCollection, processingDate, styleIds.filter((_, index) => !failureIndexes.includes(index))),
            markFailedChanges(pricesCollection, processingDate, styleIds.filter((_, index) => failureIndexes.includes(index))),
        ])
    }


    /*const error = (algoliaUpdateError || messageFailures.length)
        ? {
            messageFailures,
            algoliaUpdateError
        }
        : undefined

    if (error) {
        log.error(error)
    }

    return {
        styleIds,
        counts: {
            styleIds: styleIds.length,
            successes: styleIds.length - failureIndexes.length,
            failures: failureIndexes.length
        },
        failureIndexes,
        messageFailures,
        algoliaUpdateError
    };*/
};

module.exports = global.main;
