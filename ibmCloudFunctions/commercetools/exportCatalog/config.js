const { languageKeys } = require('../constantsCt')

// See https://commercetools.github.io/nodejs/cli/product-exporter.html
const exportConfig = {
  batch: 500,
  json: true,
  expand: ['categories[*]', 'variants[*].attributes[*].value[*]'],
  predicate: 'variants(attributes(name="webStatus" and value=true))',
  staged: false
}

const logger = {
  error: console.error,
  warn: console.warn,
  info: console.log,
  debug: console.debug
}

const csvHeaders = [
  'title',
  'id',
  'price',
  'currency',
  'sale_price',
  'condition',
  'availability',
  'language',
  'adult',
  'age',
  'brand',
  'color',
  'description',
  'gtin',
  'image_link',
  'parent_sku',
  'link',
  'category',
  'size'
]

const productDomain = 'https://harryrosen.com'

const outputFilenames = {
  [languageKeys.ENGLISH]: './harryrosen-en.csv',
  [languageKeys.FRENCH]: './harryrosen-fr.csv',
}

module.exports = {
  csvHeaders,
  exportConfig,
  logger,
  outputFilenames,
  productDomain
}
