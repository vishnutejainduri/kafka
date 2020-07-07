const { siteIds } = require('../../constants')
const { isStaged } = require('../../commercetools/constantsCt');
const { getExistingCtStyle, createAndPublishStyle, createOriginalPriceUpdate } = require('../../commercetools/styleUtils');
const { getAllVariantPrices, getExistingCtOriginalPrice } = require('../../commercetools/consumeSalePriceCT/utils');

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
        const existingCtOriginalPrice = getExistingCtOriginalPrice(variantPrice);
        const priceUpdate = existingCtOriginalPrice
            ? {
              action: 'changePrice',
              priceId: existingCtOriginalPrice.id,
              price: createOriginalPriceUpdate(applicablePriceChange.newRetailPrice),
              staged: isStaged
            }
            : {
              action: 'addPrice',
              variantId: variantPrice.variantId,
              price: createOriginalPriceUpdate(applicablePriceChange.newRetailPrice),
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
