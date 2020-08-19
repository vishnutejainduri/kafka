const { siteIds } = require('../../constants')
const { isStaged, priceTypes, styleAttributeNames } = require('../../commercetools/constantsCt');
const { getExistingCtStyle, createAndPublishStyle, createPriceUpdate, getCtStyleAttributeValue } = require('../../commercetools/styleUtils');
const { getAllVariantPrices, getExistingCtOriginalPrice, getExistingCtPermanentMarkdown, getExistingCtTemporaryMarkdown, convertToCents } = require('../../commercetools/consumeSalePriceCT/utils');

const convertToDollars = (amount) => Math.round(amount / 100)

const setOnSaleFlag = (value) => ({
  action: 'setAttributeInAllVariants',
  name: 'onSale',
  value,
  staged: isStaged
});

const buildPriceActions = (applicablePriceChange, existingCtPrice, variantPrice, priceType, isSale) => {
    return existingCtPrice
        ? [{
          action: 'changePrice',
          priceId: existingCtPrice.id,
          price: createPriceUpdate(convertToCents(applicablePriceChange.newRetailPrice), priceType, applicablePriceChange.priceChangeId, applicablePriceChange.processDateCreated, applicablePriceChange.startDate, applicablePriceChange.endDate),
          staged: isStaged
        }, setOnSaleFlag(isSale)]
        : [{
          action: 'addPrice',
          variantId: variantPrice.variantId,
          price: createPriceUpdate(convertToCents(applicablePriceChange.newRetailPrice), priceType, applicablePriceChange.priceChangeId, applicablePriceChange.processDateCreated, applicablePriceChange.startDate, applicablePriceChange.endDate),
          staged: isStaged
        }, setOnSaleFlag(isSale)]
}

const updateStyleMarkdown = async (ctHelpers, productTypeId, applicablePriceChanges, styleId) => {
    // if there is a markdown (so has keys), only accept keys equal to that of online so we ignore in store markdowns
    if (Object.keys(applicablePriceChanges).length !== 0 && !Object.keys(applicablePriceChanges).includes(siteIds.ONLINE)) return null;

    const applicablePriceChange = applicablePriceChanges[siteIds.ONLINE];

    let existingCtStyle = await getExistingCtStyle(styleId, ctHelpers);
    if (!existingCtStyle) {
      // create dummy style where none exists
      existingCtStyle = (await createAndPublishStyle ({ id: styleId, name: { 'en-CA': '', 'fr-CA': '' } }, { id: productTypeId }, null, ctHelpers)).body;
    }

    const originalPrice = getCtStyleAttributeValue(existingCtStyle, styleAttributeNames.ORIGINAL_PRICE);
    // no valid sale price but no originalPrice to revert to; ignore message until original price later arrives
    if (!applicablePriceChange && !originalPrice) return null;

    const allVariantPrices = getAllVariantPrices(existingCtStyle);
    let priceUpdateActions = allVariantPrices.map((variantPrice) => {
        let priceUpdates, existingCtPrice;
        if (applicablePriceChange && applicablePriceChange.endDate) {
          existingCtPrice = getExistingCtTemporaryMarkdown(variantPrice, applicablePriceChange.priceChangeId);
          priceUpdates = buildPriceActions (applicablePriceChange, existingCtPrice, variantPrice, priceTypes.TEMPORARY_MARKDOWN, true);
        } else if (!applicablePriceChange) {
          existingCtPrice = getExistingCtOriginalPrice(variantPrice) || getExistingCtPermanentMarkdown(variantPrice)
          priceUpdates = buildPriceActions ({ newRetailPrice: convertToDollars(originalPrice.centAmount) }, existingCtPrice, variantPrice, priceTypes.ORIGINAL_PRICE, false);
        } else {
          existingCtPrice = getExistingCtOriginalPrice(variantPrice) || getExistingCtPermanentMarkdown(variantPrice)
          priceUpdates = buildPriceActions (applicablePriceChange, existingCtPrice, variantPrice, priceTypes.PERMANENT_MARKDOWN, true);
        }
        return priceUpdates;
      })
    priceUpdateActions = priceUpdateActions.reduce((finalActions, currentActions) => [...finalActions, ...currentActions], []);

    const { client, requestBuilder } = ctHelpers;
    return client.execute({
      method: 'POST',
      uri: requestBuilder.products.byKey(styleId).build(),
      body: JSON.stringify({ version: existingCtStyle.version, actions: priceUpdateActions })
    });
};

module.exports = {
  updateStyleMarkdown
};
