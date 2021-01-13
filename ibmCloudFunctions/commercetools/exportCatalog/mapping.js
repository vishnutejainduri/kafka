const {
  categoryIsValid,
  formatBarcodeFromVariantBarcodes,
  formatPriceValue,
  getAttributesFromVariant,
  getCurrentSalePrice,
  getImageUrl,
  getPriceCentAmount,
  getProductUrl,
  variantIsOnSale,
  sortCategories
} = require('./mapping.utils')

const formatVariant = (locale, product, params) => variant => {
  const attributes = getAttributesFromVariant(variant)
  const language = locale.split('-')[0]
  const sortedValidCategories = sortCategories(product.categories.filter(categoryIsValid(params.dpmRootCategoryId)))
  const salePrice = getCurrentSalePrice(variant.prices)

  return {
    title: product.name[locale],
    id: variant.sku, // SKU ID
    price: formatPriceValue(getPriceCentAmount(attributes.originalPrice)),
    currency: 'CAD',
    sale_price: variantIsOnSale(variant) ? formatPriceValue(getPriceCentAmount(salePrice)) : null,
    condition: 'new',
    availability: attributes.hasOnlineAts ? 'in stock' : 'out of stock',
    language,
    adult: 'no',
    age: 'adult',
    brand: attributes.brandName && attributes.brandName[locale],
    color: attributes.colourGroup && attributes.colourGroup[locale],
    description: product.description[locale],
    gtin: formatBarcodeFromVariantBarcodes(attributes.barcodes),
    image_link: getImageUrl(product.key),
    parent_sku: product.key, // style ID
    link: getProductUrl(language, product.key),
    category: sortedValidCategories.map(category => category.obj.name[locale]).join(','),
    size: attributes.size && attributes.size[locale]
  }
}

const getFormattedVariantsFromProduct = (locale, params) => product => {
  if (!product) return []
  return product.variants.map(formatVariant(locale, product, params))
}

module.exports = {
  formatVariant,
  getFormattedVariantsFromProduct
}
