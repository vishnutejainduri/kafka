const { productDomain } = require('./config')

const getAttributesFromVariant = variant =>
  variant.attributes.reduce((attributes, { name, value }) => ({
    ...attributes,
    [name]: value
  }), {})

const convertToDollars = cents => (cents / 100).toFixed(2)

const formatPriceValue = (cents, currency = 'CAD') => cents !== undefined ? `${convertToDollars(cents)} ${currency}` : undefined

const getPriceCentAmount = price => {
  if (!price) return undefined
  if (price.centAmount) return price.centAmount
  return price.value && price.value.centAmount
}

/**
 * This function is unfortunately necessary because we cannot use price selection
 * (see https://docs.commercetools.com/api/projects/products#price-selection)
 * with the product exporter.
 */
const getCurrentSalePrice = prices => {
  const today = new Date()

  const applicableTemporaryMarkdown = prices.find(price => {
    if (!price.custom.fields.priceType === 'temporaryMarkdown') return false
    const validFrom = new Date(price.validFrom)
    const validUntil = new Date(price.validUntil)
    return today >= validFrom && today <= validUntil
  })

  const permanentMarkdown = prices.find(price => price.custom.fields.priceType === 'permanentMarkdown')

  return applicableTemporaryMarkdown || permanentMarkdown
}

const variantIsOnSale = variant => Boolean(getCurrentSalePrice(variant.prices))

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
  "Valid" as in should be exported. Used primarily to filter out the brand
  category, which is distinct from the main Jesta level 1 to 3 categories
  that should be sent to GMC and FBM. All level 1 to 3 categories in
  commercetools have the root DPM category as an ancestor.
*/
const categoryIsValid = dpmRootCategoryId => category =>
  category.obj.ancestors.some(({ id }) => id === dpmRootCategoryId)

/**
 * Used to make sure the categories C1 > C2 > C3 are formatted in the correct
 * order. commercetools does not guarantee the order of the categories in the
 * category array that it returns.
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
  getCurrentSalePrice,
  getImageUrl,
  getPriceCentAmount,
  getProductUrl,
  sortCategories,
  variantIsOnSale
}
