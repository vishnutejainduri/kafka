const { siteIds } = require('../../constants')
const { isStaged, priceTypes, styleAttributeNames } = require('../../commercetools/constantsCt');
const { getExistingCtStyle, createAndPublishStyle, createPriceUpdate, getCtStyleAttributeValue } = require('../../commercetools/styleUtils');
const { getAllVariantPrices, getExistingCtOriginalPrice, getExistingCtPermanentMarkdown, convertToCents } = require('../../commercetools/consumeSalePriceCT/utils');

const updateStylePermanentMarkdown = async (ctHelpers, productTypeId, applicablePriceChanges, styleId) => {
    console.log('applicablePriceChanges', applicablePriceChanges);
    // only handle online site id prices
    if (!Object.keys(applicablePriceChanges).includes(siteIds.ONLINE)) return null;

    const applicablePriceChange = applicablePriceChanges[siteIds.ONLINE];

    // only handle null end date (permanent markdowns), return null if valid end date (temporary markdown)
    if (applicablePriceChange && applicablePriceChange.endDate) return null;

    let existingCtStyle = await getExistingCtStyle(styleId, ctHelpers);
    if (!existingCtStyle) {
      // create dummy style where none exists
      existingCtStyle = (await createAndPublishStyle ({ id: styleId, name: { 'en-CA': '', 'fr-CA': '' } }, { id: productTypeId }, null, ctHelpers)).body;
    }

    const allVariantPrices = getAllVariantPrices(existingCtStyle);
    let priceUpdateActions = allVariantPrices.map((variantPrice) => {
        let priceUpdate;
        const existingCtPrice = getExistingCtOriginalPrice(variantPrice) || getExistingCtPermanentMarkdown(variantPrice)
        if (!applicablePriceChange) {
          priceUpdate = existingCtPrice
              ? {
                action: 'changePrice',
                priceId: existingCtPrice.id,
                price: createPriceUpdate(getCtStyleAttributeValue(existingCtStyle, styleAttributeNames.ORIGINAL_PRICE).centAmount, priceTypes.ORIGINAL_PRICE),
                staged: isStaged
              }
              : {
                action: 'addPrice',
                variantId: variantPrice.variantId,
                price: createPriceUpdate(getCtStyleAttributeValue(existingCtStyle, styleAttributeNames.ORIGINAL_PRICE).centAmount, priceTypes.ORIGINAL_PRICE),
                staged: isStaged
              }
        } else {
          priceUpdate = existingCtPrice
              ? {
                action: 'changePrice',
                priceId: existingCtPrice.id,
                price: createPriceUpdate(convertToCents(applicablePriceChange.newRetailPrice), priceTypes.PERMANENT_MARKDOWN),
                staged: isStaged
              }
              : {
                action: 'addPrice',
                variantId: variantPrice.variantId,
                price: createPriceUpdate(convertToCents(applicablePriceChange.newRetailPrice), priceTypes.PERMANENT_MARKDOWN),
                staged: isStaged
              }
        }
        return [priceUpdate];
      })
    priceUpdateActions = priceUpdateActions.reduce((finalActions, currentActions) => [...finalActions, ...currentActions], []);
    console.log('priceUpdateActions', JSON.stringify(priceUpdateActions));

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
