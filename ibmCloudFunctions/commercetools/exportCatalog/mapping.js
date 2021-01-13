const {
  categoryIsValid,
  formatBarcodeFromVariantBarcodes,
  formatPriceValue,
  getAttributesFromVariant,
  variantIsOnSale,
  getProductUrl,
  getImageUrl,
  sortCategories
} = require('./mapping.utils')

const formatVariant = (locale, product, params) => variant => {
  const attributes = getAttributesFromVariant(variant)
  const language = locale.split('-')[0]
  const validCategories = sortCategories(product.categories.filter(categoryIsValid(params.dpmRootCategoryId)))

  return {
    title: product.name[locale],
    id: variant.sku, // sku ID
    price: formatPriceValue(attributes.originalPrice.centAmount),
    currency: 'CAD',
    sale_price: variantIsOnSale(variant) ? formatPriceValue(variant.prices[0].value.centAmount) : null, // TODO: confirm correctness
    condition: 'new',
    availability: attributes.hasOnlineAts ? 'in stock' : 'out of stock',
    language,
    adult: 'no',
    age: 'adult',
    brand: attributes.brandName[locale],
    color: attributes.colourGroup[locale],
    description: product.description[locale],
    gtin: formatBarcodeFromVariantBarcodes(attributes.barcodes),
    imageLink: getImageUrl(product.key),
    parent_sku: product.key, // style ID
    link: getProductUrl(language, product.key),
    category: validCategories.map(category => category.obj.name[locale]).join(','),
    size: attributes.size[locale]
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
