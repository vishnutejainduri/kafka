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
  - If the microsite category does exist in CT but is flagged for deletion, we make sure to remove it from the list of categories assigned to the style. NOTE: we do not deletd the microsite cateogry itself
  - If the microsite category does exist in CT and is not flagged for deletion, we make a check to see if any of the microsite category labels have changed. If they have we make an update call to CT updating the microsite category
- We make a series of update action calls to the product in CT, updating the attributes as per the current facet message in the batch

## consumeSalePriceCT
- `index.js` is the main file where execution starts, `utils.js` holds functions used by `index.js`
- Kafka messages not from the sale price topic are rejected
- Kafka messages for sale prices not for site id `00990` are rejected
- Kafka messages for sale prices with no end date (and therefore are permanent markdowns) are rejected
- Kafka messages are then transformed from JESTA fields to relevant CT attributes, 23 hrs 59 mins and 58 secs is added to any end date
- We then batch sale price messages by style id to avoid concurrent modifications to the same product in CT
- We then loop through the batched sale price messages, for each batch we sort the sale price messages from oldest to newest
- We get an existing product from CT if it exists
- If an existing product for the sale price message doesn't exist we create a "dummy" style. An empty style with no attributes
- We then fetch all price rows for every variant including the master variant for the product in CT
- For each variant and it's price rows we do the following:
  - Try and get an existing price row matching the sale price message from the variant
  - If there is an existing matchng price row on the variant and it is newer than the sale price message we stop execution on this variant since there is no need to update anything
  - If the activity type of the sale price message is approved or created, we create an update action if an existing matching price row exists otherwise we create a create price row action for a new price row
  - If the activity type of the sale price message is deleted, we create an update action to remove the price row for the variant
- We send all price row actions created for every variant to CT

## consumeSalesOrderMessageCT
- `index.js` is the main file where execution starts, `orderUtils.js` holds functions used by `index.js`
- First kafka messages are filtered so that only sales order header topic messages are processed
- Kafka messages are transformed from JESTA named fields to appropriate CT sales order header field names
- Messages are batched by order number, this is to prevent concurrent updates to a single order which CT doesn't allow
- The batched sales order header messages are sent to be processed in another function
- The first step is we go through a batch of messages and only process the most recent one
- We then fetch the order number from CT. If it does not exist we throw an error and end execution
- We then compare the existing CT sales order header statuses with the batched message sales order headers to determine which (if any) are older than the ones already existing in CT
- We then make a call for each batched sales order header message remaining updating the corresponding order in CT

## consumeSalesOrderDetailsMessageCT
- `index.js` is the main file where execution starts, `orderUtils.js` holds functions used by `index.js`
- First kafka messages are filtered so that only sales order line item topic messages are processed
- Kafka messages are transformed from JESTA named fields to appropriate CT sales order line item field names
- Messages are batched by order number, this is to prevent concurrent updates to a single order which CT doesn't allow
- The batched sales order line item messages are sent to be processed in another function
- The first step we fetch the order by order number from CT. If it does not exist we throw an error and end execution
- We then fetch all individual line items from the existing CT order. If a line item does not exist we throw an error and end execution
- We then compare the existing CT sales order line item statuses with the batched message sales order line items to determine which (if any) are older than the ones already existing in CT
- We remove any batched messages that are older than the ones in CT
- We run a filter on the batched messages removing any duplicates
- We then make a call for each batched sales order line item message remaining updating the corresponding order line item in CT

## consumeShipmentMessageCT
- `index.js` is the main file where execution starts, `orderUtils.js` holds functions used by `index.js`
- First kafka messages are filtered so that only shipment header topic messages are processed
- Kafka messages are transformed from JESTA named fields to appropriate CT shipment custom object field names
- Messages are batched by order number, this is to prevent concurrent updates to a single order which CT doesn't allow
- The batched shipment header messages are sent to be processed in another function
- The first step we fetch the existing shipment custom object if it exists
- We then compare the existing CT shipment custom objects with the batched message shipment headers to determine which (if any) are older than the ones already existing in CT
- We remove any batched messages that are older than the ones in CT
- We run a filter on the batched messages removing any duplicates
- We then make a call for each batched shipment header message remaining updating/creating the corresponding shipment custom object in CT
- In the final step we take all created/updated shipment header messages and ensure to "link" them to the order in CT by adding their CT ids to a custom field on the order CT record

## consumeShipmentDetailsMessageCT
- `index.js` is the main file where execution starts, `orderUtils.js` holds functions used by `index.js`
- First kafka messages are filtered so that only shipment line item topic messages are processed
- Kafka messages are transformed from JESTA named fields to appropriate CT shipment custom object field names
- Messages are batched by order number, this is to prevent concurrent updates to a single order which CT doesn't allow
- The batched shipment line item messages are sent to be processed in another function
- The first step we fetch the existing shipment custom object if it exists
- We then further group the batched message by a unique shipment id
- For this batch of batches, we run a "merge" function with the existing shipment custom object line items and either add/update/remove based on which messages shared the same shipment detail id and whether they are more recent or not
- We then make a call for each batched shipment line item message remaining updating/creating the corresponding shipment custom object in CT
- In the final step we take all created/updated shipment line item messages and ensure to "link" them to the order in CT by adding their CT ids to a custom field on the order CT record

## consumeReturnDetailsMessageCT
- `index.js` is the main file where execution starts, `orderUtils.js` holds functions used by `index.js`
- First kafka messages are filtered so that only return line item topic messages are processed
- Kafka messages are transformed from JESTA named fields to appropriate CT return custom object field names
- Messages are batched by order number, this is to prevent concurrent updates to a single order which CT doesn't allow
- The batched return line item messages are sent to be processed in another function
- The first step we fetch the existing return custom object if it exists
- We then further group the batched message by a unique return id
- For this batch of batches, we run a "merge" function with the existing return custom object line items and either add/update/remove based on which messages shared the same return detail id and whether they are more recent or not
- We then make a call for each batched return line item message remaining updating/creating the corresponding return custom object in CT
- In the final step we take all created/updated return line item messages and ensure to "link" them to the order in CT by adding their CT ids to a custom field on the order CT record

## consumeSkuMessageCT
- `index.js` is the main file where execution starts, `utils.js` holds functions used by `index.js`
- First kafka messages are filtered so that only sku topic messages and organization 1 skus are processed
- Kafka messages are transformed from JESTA named fields to appropriate CT sku field names
- Messages are batched by style id, this is to prevent concurrent updates to a single product which CT doesn't allow
- The batched sku messages are sent to be processed in another function
- We then attempt to fetch an existing style for each batched sku message
- If we cannot find an existing style in CT for a batched sku message, we create a "dummy" style. A product in CT with no attributes
- We then fetch all existing variants (skus) from the existing style in CT
- We then compare the existing CT skus with the batched message skus to determine which (if any) are older than the sku already existing in CT
- We then remove any batched sku messages that are older than the existing CT sku
- We then remove any duplicate sku messages within the batched skus
- We then make a call for each batched sku message remaining updating/creating the corresponding variant on the product in CT
- As part of updating/creating the variant we also compare all price rows with the master variant and update the updating/creating variant with price rows from the master variant
- All calls to CT are batched by a constant "action limit", since we cannot exceed 500 update actions to CT in a single call we need to break down all calls into batches of 500

## consumeStylesBasicMessageCT
- `index.js` is the main file where execution starts, `utils.js` holds functions used by `index.js`
- Kafka messages are filtered, any not from the styles basics topic are rejected
- Kafka messages are then transformed from JESTA attributes to CT relevant attributes
- Messages are then batched by style id to prevent concurrent updates to the same product in CT
- We loop through each batch of styles basic messages, picking up only the newest message and rejecting the rest in a batch. We process only that message in the batch
- We fetch the product type record from CT
- We attempt to fetch an existing product from CT for this styles basic message
- If there is no existing product from CT for this styles basic message we create a "dummy" style. An empty style with no attributes.
- We compare the existing product from CT with the styles basic message, if the existing product in CT is newer than the styles basic message we ignore it
- We make a series of update action calls to the product in CT, updating the attributes as per the current styles basic message in the batch. Styles basic only really updates a single field in CT, isOutlet based on BRAND_ID from JESTA

## updateCTSalePrice
- `index.js` is the main file where execution starts, `utils.js` holds functions used by `index.js`. `index.js` also shares functions from `product-consumers/updateAlgoliaPrice/utils.js`
- This function runs every minute or whenever a style updates in CT
- At the start of each run we get the current date and time
- We then either fetch any price rows from the prices collection in mongo where their start date has been flagged as unprocessed and is older or equal to current datetime OR we simply process any style messages passed to the function (this only happens when executed after consumeCatalogMessageCT)
- We loop through all style messages, checking their price rows and determining what sale price updates need to happen for CT
  - For each style we start by grabbing all price rows in mongo and batching them by their site id
  - For each batched price rows we first sort them into two seperate rows, price rows that are creations/updates and price rows that are deletions
  - From the price rows that are creations/updates we delete any that also exist in the price rows that are marked as deletions
  - From this list of price rows we then batch by their unique price id (priceChangeId)
  - We go through each batch of price rows and take only the latest price row (all updates are newer than any creates or older updates so we end up retriving only the latest price row for each priceChangeId)
  - From this final list of batched price rows we determine if there are any overlapping prices based on start date and end date. Any price row with no end date automatically is replaced by a price row with an end date. Two price rows with overlapping start and end dates cause an error since we cannot determine a current sale price. We throw an error and stop execution in that case
- Once we've determined a current sale price, we prepare the update to CT
- If the current active sale price is not for the online site id (`00990`), we end execution here. We only send online data to CT
- We try and fetch an existing style for the active sale price from CT
- If there is no existing style we create a "dummy" style. A product with no attributes
- We then fetch an original price custom attribute value from the CT product
- If there is no active sale price but also no original price custom attribute value, we stop execution since the code would need to revert back to original price but it can't without an original price value
- We then fetch all price rows from all variants on the existing CT product
- Going through every variant from the CT product, we apply the following based on the active sale price:
  - If the active sale price is a sale and has an end date (meaning it's a temporary markdown), we send update/creation actions to create this temporary markdown price row for the variant
  - If the active sale price is not a sale, that means there are no active sales for the product and we must revert to original price. Update/create actions are sent to CT to revert back any permanent markdowns to original price and/or update the original price if that is the case
  - Otherwise, the active sale price is a sale and has no end date (meaning it's a permanent markdown). We send update/create actions to CT to set the permanent markdown sale price, overwritting and original price rows in the process
- After all messages are processed, any price rows that were successfully processed are marked as processed so that they won't be reprocessed later. If any failure occurs then they are flagged as "failure" and an alert is sent out (this is usually due to overlapping temporary markdowns that we cannot correct on our side)
