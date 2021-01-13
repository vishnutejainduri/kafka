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

const headers = [
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
  'imageLink',
  'parent_sku',
  'link',
  'category',
  'size'
]

const productDomain = 'https://harryrosen.com'

module.exports = {
  exportConfig,
  logger,
  headers,
  productDomain
}
