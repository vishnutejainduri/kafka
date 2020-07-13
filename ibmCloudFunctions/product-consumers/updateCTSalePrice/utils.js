const { siteIds } = require('../../constants')
const { isStaged, priceTypes } = require('../../commercetools/constantsCt');
const { getExistingCtStyle, createAndPublishStyle, createPriceUpdate } = require('../../commercetools/styleUtils');
const { getAllVariantPrices, getExistingCtOriginalPrice, getExistingCtPermanentMarkdown, convertToCents } = require('../../commercetools/consumeSalePriceCT/utils');

const updateStylePermanentMarkdown = async (ctHelpers, productTypeId, applicablePriceChanges) => {
    const applicablePriceChange = applicablePriceChanges[siteIds.ONLINE];
    // only handle online site id prices
    if (!applicablePriceChange) return null;

    // only handle null end date (permanent markdowns)
    if (applicablePriceChange.endDate) return null;

    let existingCtStyle = await getExistingCtStyle(applicablePriceChange.id, ctHelpers);
    if (!existingCtStyle) {
      // create dummy style where none exists
      existingCtStyle = (await createAndPublishStyle ({ id: applicablePriceChange.id, name: { 'en-CA': '', 'fr-CA': '' } }, { id: productTypeId }, null, ctHelpers)).body;
    }

    const allVariantPrices = getAllVariantPrices(existingCtStyle);
    let priceUpdateActions = allVariantPrices.map((variantPrice) => {
        const existingCtPrice = getExistingCtOriginalPrice(variantPrice) || getExistingCtPermanentMarkdown(variantPrice)
        const priceUpdate = existingCtPrice
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
          return [priceUpdate];
      })
    priceUpdateActions = priceUpdateActions.reduce((finalActions, currentActions) => [...finalActions, ...currentActions], []);

    const { client, requestBuilder } = ctHelpers;
    return client.execute({
      method: 'POST',
      uri: requestBuilder.products.byKey(applicablePriceChange.id).build(),
      body: JSON.stringify({ version: existingCtStyle.version, actions: priceUpdateActions })
    });
};

module.exports = {
  updateStylePermanentMarkdown
};
