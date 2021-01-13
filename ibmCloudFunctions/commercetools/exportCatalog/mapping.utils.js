const { productDomain } = require('./config')

const getAttributesFromVariant = variant =>
  variant.attributes.reduce((attributes, { name, value }) => {
    attributes[name] = value
    return attributes
  }, {})

const convertToDollars = cents => (cents / 100).toFixed(2)

const formatPriceValue = (cents, currency = 'CAD') => cents !== undefined ? `${convertToDollars(cents)} ${currency}` : undefined

const variantIsOnSale = variant =>
  (Boolean(variant.price && variant.price.custom && variant.price.custom.fields)) &&
  (variant.price.custom.fields.priceType === 'permanentMarkdown' ||
   variant.price.custom.fields.priceType === 'temporaryMarkdown')

const barcodeIsValid = barcode => {
  const validBarcodeSubtypes = ['UPCA', 'EAN']
  const barcodeSubtype = barcode.obj && barcode.obj.value && barcode.obj.value.subType
  return validBarcodeSubtypes.includes(barcodeSubtype)
}

const formatBarcodeFromVariantBarcodes = (barcodes = []) => {
  const validBarcodes = barcodes.filter(barcodeIsValid)
  if (validBarcodes && validBarcodes.length > 0) {
    return validBarcodes[0].obj.value.barcode
  }
  return null
}

const getProductUrl = (language, productKey) => {
  const languagesToProduct = {
    en: 'product',
    fr: 'produit'
  }
  return `${productDomain}/${language}/${languagesToProduct[language]}/${productKey}`
}

const getImageUrl = productKey => `https://i1.adis.ws/i/harryrosen/${productKey}`

/*
  "Valid" as in should be sent to GMC or FBM. Used primarily to filter out the
  brand category, which is distinct from the main Jesta level 1 to 3 categories
  that should be sent to GMC and FBM. All level 1 to 3 categories in
  commercetools have the root DPM category as an ancestor.
*/
const categoryIsValid = dpmRootCategoryId => category =>
  category.obj.ancestors.some(({ id }) => id === dpmRootCategoryId)

/**
 * @returns Categories sorted in ascending order by number of ancestors
 */
const sortCategories = ctCategories => ctCategories.sort((category1, category2) => {
  const category1AncestorCount = category1.obj.ancestors.length
  const category2AncestorCount = category2.obj.ancestors.length
  return category1AncestorCount - category2AncestorCount
})

module.exports = {
  categoryIsValid,
  formatBarcodeFromVariantBarcodes,
  formatPriceValue,
  getAttributesFromVariant,
  getImageUrl,
  getProductUrl,
  sortCategories,
  variantIsOnSale
}
