const {
  getExistingCtStyle,
  getProductType,
  updateStyle,
  createAndPublishStyle,
  categoryKeyFromNames,
  getCategory,
  createCategory,
  updateCategory,
  categoryNeedsUpdating,
  getCtStyleAttributeValue
} = require('../styleUtils');
const { languageKeys, entityStatus, MICROSITES_ROOT_CATEGORY, styleAttributeNames, clearancePromotionalSticker } = require('../constantsCt');
const { MICROSITE, PROMO_STICKER } = require('../../lib/constants');

const createOrUpdateCategoriesFromFacet = async (facet, existingCtStyle, ctHelpers) => {
  // only microsite facets generate categories
  if (!facet[MICROSITE]) return null;

  const enCA = languageKeys.ENGLISH;
  const frCA = languageKeys.FRENCH;

  const categoryKeys = [
    categoryKeyFromNames(MICROSITES_ROOT_CATEGORY),
    facet.facetId 
  ];

  const categories = await Promise.all(categoryKeys.map(key => getCategory(key, ctHelpers)));
  const existingCtStyleData = existingCtStyle.masterData && (existingCtStyle.masterData[entityStatus])
  let existingCategories = existingCtStyleData
    ? existingCtStyleData.categories
    : null

  if (!categories[0]) {
    categories[0] = await createCategory(categoryKeys[0], {
      [enCA]: MICROSITES_ROOT_CATEGORY,
      [frCA]: MICROSITES_ROOT_CATEGORY
    }, null, ctHelpers);
  }

  if (!categories[1] && !facet.isMarkedForDeletion) {
    categories[1] = await createCategory(categoryKeys[1], facet[MICROSITE], categories[0], ctHelpers);
  } else if (!categories[1] && facet.isMarkedForDeletion) {
    throw new Error('Microsite that does not exist cannot be deleted')
  } else if (categories[1] && facet.isMarkedForDeletion) {
    // marked for deletion, remove from category array to delete on style update
    existingCategories = existingCategories.filter(existingCategory => existingCategory.id !== categories[1].id);
    categories[1] = null;
  } else if (categoryNeedsUpdating(categories[1], facet[MICROSITE])) {
    categories[1] = await updateCategory(categoryKeys[1], categories[1].version, facet[MICROSITE], categories[0], ctHelpers)
  }

  return [...categories.slice(1, categories.length), ...existingCategories].filter(Boolean)
};

const updateStyleFacets = async (ctHelpers, productTypeId, stylesFacetMessage) => {
    if ((stylesFacetMessage[MICROSITE] || !stylesFacetMessage[PROMO_STICKER]) && (!stylesFacetMessage[MICROSITE] || stylesFacetMessage[PROMO_STICKER])) {
      throw new Error('Invalid facet id mapping')
    }
    const productType = await getProductType(productTypeId, ctHelpers);
    let existingCtStyle = await getExistingCtStyle(stylesFacetMessage.id, ctHelpers);

    if (!existingCtStyle) {
      existingCtStyle = (await createAndPublishStyle ({ id: stylesFacetMessage.id, name: { 'en-CA': '', 'fr-CA': '' } }, { id: productTypeId }, null, ctHelpers)).body;
    }

    // dont update promo sticker if isReturnable = false and promoSticker = Final Sale
    const isReturnable = getCtStyleAttributeValue(existingCtStyle, 'isReturnable')
    const promotionalSticker = getCtStyleAttributeValue(existingCtStyle, 'promotionalSticker')
    
    const isPromotionalSticker = Object.keys(stylesFacetMessage).find((attribute) => attribute === styleAttributeNames.PROMOTIONAL_STICKER)
    const isClearencePromotionalSticker = promotionalSticker && promotionalSticker[languageKeys.ENGLISH] === clearancePromotionalSticker[languageKeys.ENGLISH] && promotionalSticker[languageKeys.FRENCH] === clearancePromotionalSticker[languageKeys.FRENCH]
    const isFinalSale = !isReturnable && isClearencePromotionalSticker
    
    const micrositeCategories = await createOrUpdateCategoriesFromFacet(stylesFacetMessage, existingCtStyle, ctHelpers);

    if (!isPromotionalSticker || (isPromotionalSticker && !isFinalSale)) {
      return updateStyle({ style: stylesFacetMessage, existingCtStyle, productType, categories: micrositeCategories, ctHelpers});
    }
};

module.exports = {
  updateStyleFacets,
  createOrUpdateCategoriesFromFacet
};
