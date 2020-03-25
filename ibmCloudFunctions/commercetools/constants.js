/**
 * Custom CT product attributes.
 * @enum {String}
 */
const attributeNames = {
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
  BARCODES: 'barcodes'
};

const BARCODE_NAMESPACE = 'barcodes'; // namespace of the custom barcode objects in CT

module.exports = {
  attributeNames,
  BARCODE_NAMESPACE
};
