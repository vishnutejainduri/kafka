const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { createLog, addErrorHandling, log, passDownAnyMessageErrors, addLoggingToMain } = require('../../product-consumers/utils');
const {
  extractStyleId,
  findApplicablePriceChanges,
  findUnprocessedStyleIds,
  markProcessedChanges,
  markFailedChanges
} = require('../../product-consumers/updateAlgoliaPrice/utils.js');

// CT related requires
const { updateStyleMarkdown } = require('./utils');
const getCtHelpers = require('../../lib/commercetoolsSdk');

// Holds two CT helpers, including the CT client. It's declared outside of
// `main` so the same client can be shared between warm starts.
let ctHelpers;

const main = async function (params) {
    log(createLog.params('updateCTSalePrice', params));
    const { productTypeId } = params;

    if (!ctHelpers) {
      ctHelpers = getCtHelpers(params);
    }

    let pricesCollection;
    try {
        pricesCollection = await getCollection(params);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError); 
    }
    
    const processingDate = new Date()
    const styleIds = params.messages && params.messages.length
        ? params.messages.map(addErrorHandling(extractStyleId))
        : await findUnprocessedStyleIds(pricesCollection, processingDate, 'CT')

    let CTUpdateResult = await Promise.all(styleIds
        .map(addErrorHandling(async (styleId) => {
            const prices = await pricesCollection.findOne({ styleId });
            const priceChanges = prices && prices.priceChanges || []
            const applicablePriceChanges = findApplicablePriceChanges(priceChanges)
            const styleUpdate = updateStyleMarkdown(ctHelpers, productTypeId, applicablePriceChanges, styleId)
            return styleUpdate;
        }))
    );

    const failureIndexes = []
    CTUpdateResult.forEach((update, index) => {
        if ((update instanceof Error) || (update && update.statusCode !== 200)) {
            failureIndexes.push(index)
        }
    });

    // We mark the price changes that were successfully processed as well as those that failed to process,
    // so that in the next run we don't reprocess them
    await Promise.all([
        markProcessedChanges(pricesCollection, processingDate, styleIds.filter((_, index) => !failureIndexes.includes(index)), 'CT'),
        markFailedChanges(pricesCollection, processingDate, styleIds.filter((_, index) => failureIndexes.includes(index)), 'CT'),
    ])

    return passDownAnyMessageErrors(CTUpdateResult)
};

global.main = addLoggingToMain(main);

module.exports = global.main;
