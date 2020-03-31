/**
 * Custom CT product attributes that apply to styles
 * @enum {String}
 */
const styleAttributeNames = {
  SEASON: 'season',
  BRAND_NAME: 'brandName',
  CONSTRUCTION: 'construction',
  FABRIC_AND_MATERIALS: 'fabricAndMaterials',
  STYLE_AND_MEASUREMENTS: 'styleAndMeasurements',
  CARE_INSTRUCTIONS: 'careInstructions',
  ADVICE: 'advice',
  WEB_STATUS: 'webStatus',
  VSN: 'vsn',
  STYLE_LAST_MODIFIED_INTERNAL: 'styleLastModifiedInternal',
  ORIGINAL_PRICE: 'originalPrice',
  ONLINE_SALE_PRICE: 'onlineSalePrice',
  IS_ONLINE_SALE: 'isOnlineSale',
  ONLINE_DISCOUNT: 'onlineDiscount',
  STYLE_OUTLET_LAST_MODIFIED_INTERNAL: 'styleOutletLastModifiedInternal',
  IS_OUTLET: 'isOutlet'
};

/**
 * Custom CT product attributes that apply to SKUs
 * @enum {String}
 */
const skuAttributeNames = {
  SKU_LAST_MODIFIED_INTERNAL: 'skuLastModifiedInternal',
  COLOR_ID: 'colorId',
  SIZE_ID: 'sizeId',
  SIZE: 'size',
  DIMENSION_ID: 'dimensionId',
  BARCODES: 'barcodes'
};

const BARCODE_NAMESPACE = 'barcodes'; // namespace of the custom barcode objects in CT
const KEY_VALUE_DOCUMENT = 'key-value-document'; // reference-type of custom objects in CT

const currencyCodes = {
  CAD: 'CAD'
};

module.exports = {
  BARCODE_NAMESPACE,
  KEY_VALUE_DOCUMENT,
  styleAttributeNames,
  skuAttributeNames,
  currencyCodes
};
