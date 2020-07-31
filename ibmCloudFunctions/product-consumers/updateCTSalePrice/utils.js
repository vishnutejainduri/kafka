const { siteIds } = require('../../constants')
const { isStaged, priceTypes, styleAttributeNames } = require('../../commercetools/constantsCt');
const { getExistingCtStyle, createAndPublishStyle, createPriceUpdate, getCtStyleAttributeValue } = require('../../commercetools/styleUtils');
const { getAllVariantPrices, getExistingCtOriginalPrice, getExistingCtPermanentMarkdown, convertToCents } = require('../../commercetools/consumeSalePriceCT/utils');

const setOnSaleFlag = (value) => ({
  action: 'setAttributeInAllVariants',
  name: 'onSale',
  value,
  staged: isStaged
});

const updateStylePermanentMarkdown = async (ctHelpers, productTypeId, applicablePriceChanges, styleId) => {
    // only handle online site id prices
    if (!Object.keys(applicablePriceChanges).includes(siteIds.ONLINE)) return null;

    const applicablePriceChange = applicablePriceChanges[siteIds.ONLINE];

    let existingCtStyle = await getExistingCtStyle(styleId, ctHelpers);
    if (!existingCtStyle) {
      // create dummy style where none exists
      existingCtStyle = (await createAndPublishStyle ({ id: styleId, name: { 'en-CA': '', 'fr-CA': '' } }, { id: productTypeId }, null, ctHelpers)).body;
    }

    const allVariantPrices = getAllVariantPrices(existingCtStyle);
    let priceUpdateActions = allVariantPrices.map((variantPrice) => {
        let priceUpdates;
        const existingCtPrice = getExistingCtOriginalPrice(variantPrice) || getExistingCtPermanentMarkdown(variantPrice)
        if (applicablePriceChange && applicablePriceChange.endDate) {
          priceUpdates = [setOnSaleFlag(true)];
        } else if (!applicablePriceChange) {
          priceUpdates = existingCtPrice
              ? [{
                action: 'changePrice',
                priceId: existingCtPrice.id,
                price: createPriceUpdate(getCtStyleAttributeValue(existingCtStyle, styleAttributeNames.ORIGINAL_PRICE).centAmount, priceTypes.ORIGINAL_PRICE),
                staged: isStaged
              }, setOnSaleFlag(false)]
              : [{
                action: 'addPrice',
                variantId: variantPrice.variantId,
                price: createPriceUpdate(getCtStyleAttributeValue(existingCtStyle, styleAttributeNames.ORIGINAL_PRICE).centAmount, priceTypes.ORIGINAL_PRICE),
                staged: isStaged
              }, setOnSaleFlag(false)]
        } else {
          priceUpdates = existingCtPrice
              ? [{
                action: 'changePrice',
                priceId: existingCtPrice.id,
                price: createPriceUpdate(convertToCents(applicablePriceChange.newRetailPrice), priceTypes.PERMANENT_MARKDOWN),
                staged: isStaged
              }, setOnSaleFlag(true)]
              : [{
                action: 'addPrice',
                variantId: variantPrice.variantId,
                price: createPriceUpdate(convertToCents(applicablePriceChange.newRetailPrice), priceTypes.PERMANENT_MARKDOWN),
                staged: isStaged
              }, setOnSaleFlag(true)]
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
  updateStylePermanentMarkdown
};
