This directory contains OpenWhisk cloud functions and configurations for MongoDB and Algolia product data syncing, in IBM Cloud.

# Cloud Functions
## addFacetsToBulkImportQueue
- `index.js` is the main file where execution starts
- Kafka messages are transformed from JESTA named fields to appropriate mongo/algolia facet field names
- Using a single insert query, all transformed facet messages are added to a mongo collection to be processed by another cloud function (`updateAlgoliaFacets`) for Algolia

## bulkCalculateAvailableToSell
- `index.js` is the main file where execution starts. `utils.js` is used as suplimentary functions
- Execution for this cloud function runs on a periodic job and is not event based. It runs every minute
- It runs a query on the mongo collection named `bulkAtsRecalculateQueue`, getting the 20 most recent records
- For each of these records it does the following:
  - We find a relevant style record, if it cannot be found in mongo the record is removed from the queue
  - We find all skus for the relevant style record
  - For each sku we gather all relevant inventory records
  - For each inventory record we find the relevant store record
  - We then calculate ats and online ats for each sku
  - We then update and replace any ats and online ats data for each sku with the newly calculated values
  - After successfully updating ats and online ats for each sku we also insert a record into `styleAvailabilityCheckQueue` to update algoia inventory

## calculateAvailableToSell
- `index.js` is the main file where execution starts. `utils.js` is used as suplimentary functions
- Execution for this cloud function is sequentially, it will only ever run right after `consumeSkuInventoryMessage` runs
- First we filter all incoming messages, and remove any that are not from the inventory topic and not of org 1
- The kafka messages are then transformed from JESTA named fields to appropriate mongo/algolia field names
- The kafka messages are then batched by inventory id
- Within each batch only 1 message is processed, the the most recent one. The rest are removed
- We fetch the relevant style data, if it does not exist we throw an error and end execution
- We fetch the relevant sku data, if it does not exist we throw an error and end execution
- We fetch the relevant store data, if it does not exist we throw an error and end execution
- If the store is outlet, the store is closed, the store has posEnabled equal to false, we do not process the message
- Using the inventory message we update ats on the relevant sku
- If the store can fulfill online, we update online ats on the relevant sku
- After successfully processing ats and online ats we add a record to the algolia queue `styleAvailabilityCheckQueue` to process inventory updates for algolia

## cleanupMessagesLogs
- Documented under `/README.md` in the repo as part of the retry mechanism 

## consumeBarcodeMessage

## consumeCatalogMessage

## consumeSalePrice

## consumeSkuInventoryMessage

## consumeSkuMessage

## consumeStoresMessage

## consumeStylesBasicMessage

## consumeThresholdMessage

## deleteCreateAlgoliaStyles

## handleMessagesLogs
- Documented under `/README.md` in the repo as part of the retry mechanism 

## monitorKafkaConnect

## removeQuantityReserved

## resolveMessagesLogs
- Documented under `/README.md` in the repo as part of the retry mechanism 

## schemaValidation

## updateAlgoliaAndCtInventory

## updateAlgoliaFacets

## updateAlgoliaInventory

## updateAlgoliaPrice

## updateAlgoliaStyle
