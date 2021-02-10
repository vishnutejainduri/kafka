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
  STYLE_OUTLET_LAST_MODIFIED_INTERNAL: 'styleOutletLastModifiedInternal',
  IS_OUTLET: 'isOutlet',
  RELATED_PRODUCT_ID: 'relatedProductId',
  PROMOTIONAL_STICKER: 'promotionalSticker',
  COLOUR: 'colour',
  COLOUR_GROUP: 'colourGroup',
  SIZE_CHART: 'sizeChart',
  ORIGINAL_PRICE: 'originalPrice',
  IS_ENDLESS_AISLE: 'isEndlessAisle',
  IS_RETURNABLE: 'isReturnable'
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

/**
 * Custom CT order attributes that apply to orders/carts
 * @enum {String}
 */
const orderAttributeNames = {
  ORDER_LAST_MODIFIED_DATE: 'orderLastModifiedDate',
  SHIPMENTS: 'shipments',
  RETURNS: 'returns'
};
const orderDetailAttributeNames = {
  ORDER_DETAIL_LAST_MODIFIED_DATE: 'orderDetailLastModifiedDate',
  QUANTITY_CANCELLED: 'quantityCancelled'
};

/**
 * Custom CT shipment attributes that apply to the custom object 'shipments'
 * @enum {String}
 */
const shipmentAttributeNames = {
  SHIPMENT_LAST_MODIFIED_DATE: 'shipmentLastModifiedDate',
  SHIPMENT_DETAILS_LAST_MODIFIED_DATE: 'shipmentDetailLastModifiedDate'
};

const returnAttributeNames = {
  RETURN_DETAILS_LAST_MODIFIED_DATE: 'returnDetailLastModifiedDate'
};

const priceAttributeNames = {
  PROCESS_DATE_CREATED: 'processDateCreated',
  PRICE_CHANGE_ID: 'priceChangeId',
  PRICE_TYPE: 'priceType'
};

const priceTypes = {
  ORIGINAL_PRICE: 'originalPrice',
  PERMANENT_MARKDOWN: 'permanentMarkdown',
  TEMPORARY_MARKDOWN: 'temporaryMarkdown'
}

const BARCODE_NAMESPACE = 'barcodes'; // namespace of the custom barcode objects in CT
const SHIPMENT_NAMESPACE = 'shipments'; // namespace of the custom shipment objects in CT
const RETURN_NAMESPACE = 'returns'; // namespace of the custom return objects in CT
const KEY_VALUE_DOCUMENT = 'key-value-document'; // reference-type of custom objects in CT
const TAX_CATEGORY = 'jesta-tax-descriptions';
// Business rules of HarryRosen requires us to have this property set to false
const isStaged = false;
const entityStatus = isStaged ? 'staged' : 'current';

const currencyCodes = {
  CAD: 'CAD'
};

const languageKeys = {
  ENGLISH: 'en-CA',
  FRENCH: 'fr-CA'
};

const orderStates = {
  CANCELLED: 'canceledOrderStatus',
  OPEN: 'openOrderStatus',
  HOLD: 'holdOrderStatus',
  SHIPPED: 'shippedOrderStatus',
  'IN PICKING': 'inPickingOrderStatus'
};

const orderLineItemStates = {
  CANCELLED: 'canceledLineItemStatus',
  OPEN: 'openLineItemStatus',
  HOLD: 'holdLineItemStatus',
  SHIPPED: 'shippedLineItemStatus',
  'IN PICKING': 'inPickingLineItemStatus'
};

const PRODUCT_SHOULD_BE_PUBLISHED = true;

const CT_ACTION_LIMIT = 500;

const MICROSITES_ROOT_CATEGORY = 'MICROSITES';

module.exports = {
  shipmentAttributeNames,
  SHIPMENT_NAMESPACE,
  BARCODE_NAMESPACE,
  RETURN_NAMESPACE,
  KEY_VALUE_DOCUMENT,
  styleAttributeNames,
  skuAttributeNames,
  orderAttributeNames,
  orderDetailAttributeNames,
  returnAttributeNames,
  priceAttributeNames,
  currencyCodes,
  languageKeys,
  orderStates,
  orderLineItemStates,
  isStaged,
  entityStatus,
  TAX_CATEGORY,
  PRODUCT_SHOULD_BE_PUBLISHED,
  CT_ACTION_LIMIT,
  priceTypes,
  MICROSITES_ROOT_CATEGORY
};
