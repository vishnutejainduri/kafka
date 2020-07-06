const updateStylePermanentMarkdown = async (ctHelpers, productTypeId, applicablePriceChanges) => {
    const { client, requestBuilder } = ctHelpers;
    console.log('applicablePriceChanges', applicablePriceChanges);

    /*let existingCtStyle = await getExistingCtStyle(parsedPriceMessage.styleId, ctHelpers);

    if (!existingCtStyle) {
      // create dummy style where none exists
      existingCtStyle = (await createAndPublishStyle ({ id: parsedPriceMessage.styleId, name: { 'en-CA': '', 'fr-CA': '' } }, { id: productTypeId }, null, ctHelpers)).body;
    }
    
    const allVariantPrices = getAllVariantPrices(existingCtStyle);
    const actions = getActionsForSalePrice(parsedPriceMessage, allVariantPrices);

    return client.execute({
      method: 'POST',
      uri: requestBuilder.products.byKey(parsedPriceMessage.styleId).build(),
      body: JSON.stringify({ version: existingCtStyle.version, actions })
    });

    const allVariantPrices = getAllVariantPrices(existingCtStyle);
    let priceUpdateActions = style.originalPrice
      ? allVariantPrices.map((variantPrice) => {
        const existingCtOriginalPrice = getExistingCtOriginalPrice(variantPrice);
        const priceUpdate = existingCtOriginalPrice
            ? {
              action: 'changePrice',
              priceId: existingCtOriginalPrice.id,
              price: createOriginalPriceUpdate(style.originalPrice),
              staged: isStaged
            }
            : {
              action: 'addPrice',
              variantId: variantPrice.variantId,
              price: createOriginalPriceUpdate(style.originalPrice),
              staged: isStaged
            }
          return [priceUpdate];
      })
      : []
    priceUpdateActions = priceUpdateActions.reduce((finalActions, currentActions) => [...finalActions, ...currentActions], []);*/
    return null;
};

module.exports = {
  updateStylePermanentMarkdown
};
