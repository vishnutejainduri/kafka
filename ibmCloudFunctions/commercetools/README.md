This directory contains OpenWhisk cloud functions and configurations for commerecetools product data syncing, in IBM Cloud.

# Cloud Functions
## consumeBarcodeMessageCT
- `index.js` is the main file where execution starts, `utils.js` holds functions used by `index.js`
- First kafka messages are filtered so that only barcode topic messages and organization 1 barcodes are processed
- Kafka messages are transformed from JESTA named fields to appropriate CT barcode field names
- Messages are batched by style id, this is to prevent concurrent updates to a single product which CT doesn't allow
- The batched barcode messages are sent to be processed in another function
- The first step in processing them is to fetch any of these barcodes from CT if they exist
- We then compare the existing CT barcodes with the batched message barcodes to determine which (if any) are older than the barcode already existing in CT
- We then remove any batched barcode messages that are older than the existing CT barcode
- We then remove any duplicate barcode messages within the batched barcodes
- We then make a call for each batched barcode message remaining updating/creating the corresponding barcode custom object in CT
- The final step in the CF is to assign these barcodes to their respective skus (on a custom key-value attribute that exists on each sku in CT)

## consumeCatalogMessageCT
- `index.js` is the main file where execution starts, `styleUtils.js` (located in the root of the `commercetools` folder) holds functions used by `index.js`
- First kafka messages are filtered so that only style topic messages are processed. We also perform a regex getting any number after a `-` in the `STYLEID`. If this number if greater than `00` we filter out that style message as well
- Kafka messages are transformed from JESTA named fields to appropriate CT product field names
- Messages are then batched by style id to prevent concurrent updates to a single product in CT (which would result in an error)
- We then loop through the batched style messages, for each batch we grab only the latest style message
- The latest style message of the batch is then sent to a function to be synced with CT
- We fetch the product type record from CT
- We try and fetch an existing style, if the latest style message contains a product that already exists in CT
- If the latest style message contains a style that does not already exist in CT, we undergo a seperate "creation" flow
  - We first create and/or update relevant cateogires to the new style we are creating
  - We build unique keys for all level1, level2, level3 product categories and brand categories based on their english names
  - We attempt to fetch existing level1, level2, level3 product categories and the brand category based on these keys, if they exist in CT
  - If any of the categories do not exist, we make a call to CT to create them
  - If they do exist, we run a check to see if any of the category labels have changed, if they have we make a call to CT to update them
  - We then make a single call to CT to create the new product based on the attributes in the latest style message and assign the correct categories from the previous steps
  - The created style is then immediately published, all updates made from the platform are considered immediately publishable in CT
- If the latest style message contains a style that DOES already exist in CT, we go through a seperate "update" flow
  - We compare the latest style message with the product that exists in CT, if the product in CT is newer than we stop execution here and don't process the latest style message
  - If the latest style message is newer, we then create and/or update relevant cateogires to the new style we are creating
  - We build unique keys for all level1, level2, level3 product categories and brand categories based on their english names
  - We attempt to fetch existing level1, level2, level3 product categories and the brand category based on these keys, if they exist in CT
  - If any of the categories do not exist, we make a call to CT to create them
  - If they do exist, we run a check to see if any of the category labels have changed, if they have we make a call to CT to update them
  - We then run through all attributes and determine which ones require updates based on the contents of the latest style message
  - The original price row is updated with the style attributes if the product is not on sale
  - We then make a single call with all update actions to CT for the existing product
  - NOTE: In this flow we do not make a seperate call to publish, we use the `isStaged` flag in all our update calls set to false so that all changes are immediately published and not staged in CT

## consumeFacetsMessageCT
- `index.js` is the main file where execution starts, `utils.js` holds functions used by `index.js`
- Kafka messages are filtered, any not from the facets topic or any that are not mappable to our JSON of valid facet types are rejected
- Kafka messages are then transformed from JESTA attributes to CT relevant attributes. Facets that are not of type microsite and marked for deletion have an extra step where we update their values to be empty strings
- Messages are then batched by style id to prevent concurrent updates to the same product in CT
- We loop through each batch of facet messages, sorting the batch from oldest to newest
- We then go through the sorted batched processing each batched facet message in order from oldest to newest
- We fetch the product type record from CT
- We attempt to fetch an existing product from CT for this facet
- If there is no existing product from CT for this facet we create a "dummy" style. An empty style with no attributes.
- If the facet is of type "microsite", we then do the following extra steps:
  - We build a unique microsite category key using the facet's facet id field
  - We attempt to fetch an existing microsite category from CT using this unique key
  - If the microsite category does not exist in CT and is not flagged for deletion, we create it
  - If the microsite category does exist in CT but is flagged fro deletion, we make sure to remove it from the list of categories assigned to the style. NOTE: we do not deletd the microsite cateogry itself
  - If the microsite category does exist in CT and is not flagged for deletion, we make a check to see if any of the microsite category labels have changed. If they have we make an update call to CT updating the microsite category
- We make a series of update action calls to the product in CT, updating the attributes as per the current facet message in the batch

## consumeSalePriceCT
- `index.js` is the main file where execution starts, `utils.js` holds functions used by `index.js`
- Kafka messages not from the sale price topic are rejected
- Kafka messages for sale prices not for site id `00990` are rejected
- Kafka messages for sale prices with no end date (and therefore are permanent markdowns) are rejected
- Kafka messages are then transformed from JESTA fields to relevant CT attributes, 23 hrs 59 mins and 58 secs is added to any end date

## consumeSalesOrderDetailsMessageCT
## consumeSalesOrderMessageCT
## consumeShipmentDetailsMessageCT
## consumeSkuMessageCT
## consumeStylesBasicMessageCT
## updateCTSalePrice

# Configuration
## Deployment Manifests
