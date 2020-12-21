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
- Execution for this cloud function is sequential, it will only ever run right after `consumeSkuInventoryMessage` runs
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
- Documented further under `/README.md` in the repo as part of the retry mechanism 
- It polls dlqMessagesByActivationIds successMessagesByActivationIds and deletes really old messages to not take up too much space in mongodb

## consumeBarcodeMessage
- `index.js` is the main file where execution starts
- First we filter all incoming messages, and remove any that are not from the barcode topic and not of org 1
- The kafka messages are then transformed from JESTA named fields to appropriate mongo/algolia field names
- We fetch the relevant style data
- Using the transformed fields we do an upsert (either updating an existing barcode or creating a brand new one if none exists)

## consumeCatalogMessage
- `index.js` is the main file where execution starts. `utils.js` is used as suplimentary functions
- First we filter all incoming messages, and remove any that are not from the styles topic and have a style id with a suffix of `-` followed by a number greater than zero (this suffix logic is only applicable for older styles where JESTA would append `-00` to each style id. Any number besides `00` meant to was not ready for display)
- The kafka messages are then transformed from JESTA named fields to appropriate mongo/algolia field names
- We fetch the relevant style data
- We prepare three pricing update queries as follows:
  - One for updating original price in the pricing record
  - One for updating the original price processed flag in the pricing record so that pricing for algolia will be recalculated
  - One for updating the original price processed flag in the pricing record so that pricing for CT will be recalculated
- Using the transformed fields we do an upsert (either updating an existing style or creating a brand new one if none exists)
- We compare the current style in mongo with the kafka message style, if department id has changed from the value of `27` (which gets special ATS treatment), we add a record to the `bulkAtsRecalculateQueue` for ATS and Online ATS to be reprocessed  
- All of the above query operates are then run at once on the mongodb

## consumeSalePrice
- `index.js` is the main file where execution starts
- First we filter all incoming messages, and remove any that are not from the sale price topic
- The kafka messages are then transformed from JESTA named fields to appropriate mongo/algolia field names
- The kafka messages are then grouped by style id
- For each batch of sale price messages by style id we do the following:
  - We fetch the existing sale price record from mongodb
  - If there is no existing sale price record we prepare a fresh record template  
  - If there is an existing sale price record but it only has original price and zero markdowns we prepare another record template for this scenario
  - If there is an existing sale price record with existing markdowns, we do a "merge" type logic to either update or insert the new sale price message
  - We execute this template as an upsert query on mongodb

## consumeSkuInventoryMessage
- `index.js` is the main file where execution starts
- First we filter all incoming messages, and remove any that are not from the inventory topic and not of org 1
- The kafka messages are then transformed from JESTA named fields to appropriate mongo/algolia field names
- The kafka messages are then batched by inventory id
- Within each batch only 1 message is processed, the the most recent one. The rest are removed
- We fetch the relevant inventory data
- We do a comparison, if the existing inventory data is more recent than the kafka message we exit execution and do not process the kafka message
- We fetch the relevant sku data, if it does not exist we throw an error and end execution
- We run an upsert query updating or inserting the kafka inventory message
- If there was an existing inventory record and we successfully ran the kafka inventory message update, we also then do the following:
  - We subtract the kafka message quantity in picking with the existing quantity in picking
  - If the value is not greater than zero we end execution otherwise we continue
  - We fetch the relevant sku record from mongodb 
  - We take the existing sku record's quantity reserved and subtract the quantity in picking difference
  - We then run an update query on that sku record setting this result as the new quantity reserved
  - This process if all to remove reserves when JESTA has begun to pick inventory

## consumeSkuMessage
- `index.js` is the main file where execution starts
- First we filter all incoming messages, and remove any that are not from the sku topic and not of org 1
- The kafka messages are then transformed from JESTA named fields to appropriate mongo/algolia field names
- We fetch the relevant sku data from mongodb
- We do a comparison, if the existing sku data is more recent than the kafka message we exit execution and do not process the kafka message (if the sku doesn't exist we ignore this step)
- We run an upsert query updating or inserting the kafka sku message

## consumeStoresMessage
- `index.js` is the main file where execution starts. `utils.js` is used as suplimentary functions
- First we filter all incoming messages, and remove any that are not from the store topic
- The kafka messages are then transformed from JESTA named fields to appropriate mongo/algolia field names
- We fetch the relevant store data from mongodb
- If the store does not exist in mongodb, or any of the following attributes has changed: canOnlineFulfill, isOutlet, canFulfillDep27, isVisible, we query mongodb for all styles affected by this store change and add them to `bulkAtsRecalculateQueue`. This is so that we rerun ATS and Online ATS whenever major store attributes that determine ATS and Online ATS change
- We run an upsert on the kafka store message to mongodb

## consumeStylesBasicMessage
- `index.js` is the main file where execution starts
- First we filter all incoming messages, and remove any that are not from the styles basic topic
- The kafka messages are then transformed from JESTA named fields to appropriate mongo/algolia field names
- We fetch the relevant style data from mongodb
- If the style does not exist or has changed from outlet to not outlet or vice versa we do the following:
  - If the style has changed from outlet to not outlet we add a record to the collection `algoliaDeleteCreateQueue` to have algolia add the style record from it's index
  - If the style does not exist or has changed from not outlet to outlet we add a record to the collection `algoliaDeleteCreateQueue` to ave algolia remove the style record from it's index 
- We run an update query on mongodb updating the brand id and outlet fields on the relevant style record

## consumeThresholdMessage
- `index.js` is the main file where execution starts
- First we filter all incoming messages, and remove any that are not from the thresholds topic
- The kafka messages are then transformed from JESTA named fields to appropriate mongo/algolia field names
- We fetch the relevant sku data from mongodb
- We run an update query update the sku record in mongodb with the new threshold value from the kafka message
- We insert a record into `styleAvailabilityCheckQueue` for processing inventory changes in algolia

## deleteCreateAlgoliaStyles
- `index.js` is the main file where execution starts
- This cloud function does not depend on kafka and instead runs periodically every minute
- Every minute it picks up the more recent 200 records from `algoliaDeleteCreateQueue` 
- The 200 records are split into what needs to be created in algolia vs what needs to be deleted
- For each record we find the relevant style record in mongodb. If it does not exist, we ignore the record
- We then make two calls to algolia, one to deleted the styles marked for deletion and one to create the styles marked for creation

## handleMessagesLogs
- Documented further under `/README.md` in the repo as part of the retry mechanism 
- It polls retryMessagesByActivationIds  every minute and then check each single message to see if it has reached it's MAX_RETRIES or not; if it has reached it, we store it into dlqMessagesByActivationIds , otherwise we use Kafka producer and requeue that message back into its topic.

## removeQuantityReserved
- Deprecated

## resolveMessagesLogs
- Documented further under `/README.md` in the repo as part of the retry mechanism 
- it finds all the unresolved batches on messagesByActivationIds and then
- fetches the activation result by calling ibmcloud REST, and then
- if any of the messages of a batch have not succeeded, it groups and stores the unsucessful messages to be either DLQed or retried, depending on whether each unsucessful message has reached its MAX_RETRIES or not, respectively.

Note: If we cannot obtain the activation result of a batch from IBM Cloud, we consider that batch to have failed; i.e. a batch has either explicitly succeeded or it has failed. Activation result might be missing because IBM does not gaurantee that activation results will be stored for more than 24 hrs after they are recorded, and so to be on the safe side, in case for whatever reason the retry mechanism stops working for more than 24hrs and we fail to retrieve the activations, we retry every unsucessful activation.

Note: We don't attempt to resolve stored batches of message until 10 minutes after their record time, because an invocation can run up to 10 minutes on openwhisk and attempting to get the activation result sooner than that might result in the batch being retried, because as pointed out in the previous note, if activation result is not available we automatically mark the batch for retry.

Note: If a message needs to be retried, we set its nextRetry  property based on RETRY_INTERVAL and the number of times that it has been retried so far to add a back-off between retries.

## updateAlgoliaAndCtInventory
- `index.js` is the main file where execution starts. `utils.js` is used as suplimentary functions
- This cloud function does not depend on kafka and instead runs periodically every minute
- Every minute it picks up 40 records from `styleAvailabilityCheckQueue` 
- For each record we find the relevant style record in mongodb. If it does not exist or it outlet, we ignore the record
- We then fetch every sku for the relevant style from mongodb
- Using the product api and it's `/inventory/ats/` endpoint we get the full ats and online ats breakdown for the style
- We then transform the response from the product api into a number of different fields used in search by the algolia index
- We make a call to algolia sending these transformed fields and updating the style records in the algolia index
- We follow the same process again for the same styles, this time building some unique inventory fields specific to commercetools
- We make a call to commercetools sending these transformed fields and updating the product record in commercetools

## updateAlgoliaFacets
- `index.js` is the main file where execution starts
- This cloud function does not depend on kafka and instead runs periodically every minute
- Every minute it picks up 750 records from `algoliaFacetBulkImportQueue` 
- For each record we perform an aggregate, combining all records with the same style id into a single record
- We transform the mongodb facet fields to the relevant algolia index fields
- We do another transform from these algolia index fields into the relevant mongodb style record fields
- We do another transform on specifically microsite facets, converting them to the expected format in the algolia index
- We make a call to algolia sending all the transformed facet data
- We make a query on mongodb updating all styles with the transformed facet data
- Instead of removing processed records from `algoliaFacetBulkImportQueue` we mark them as processed for logging purposes 
- We run a delete query on `algoliaFacetBulkImportQueue` deleting records that are very old so as to not take up too much storage in mongodb

## updateAlgoliaPrice
- `index.js` is the main file where execution starts. `utils.js` is used as suplimentary functions
- This cloud function does not depend on kafka and instead runs periodically every minute
- At the start of each run we get the current date and time
- We then either fetch any price rows from the prices collection in mongo where their start date has been flagged as unprocessed and is older or equal to current datetime OR we simply process any style messages passed to the function (this only happens when executed after consumeCatalogMessageCT)
- We loop through all style messages, checking their price rows and determining what sale price updates need to happen for algolia
  - For each style we start by grabbing all price rows in mongo and batching them by their site id
  - For each batched price rows we first sort them into two seperate rows, price rows that are creations/updates and price rows that are deletions
  - From the price rows that are creations/updates we delete any that also exist in the price rows that are marked as deletions
  - From this list of price rows we then batch by their unique price id (priceChangeId)
  - We go through each batch of price rows and take only the latest price row (all updates are newer than any creates or older updates so we end up retriving only the latest price row for each priceChangeId)
  - From this final list of batched price rows we determine if there are any overlapping prices based on start date and end date. Any price row with no end date automatically is replaced by a price row with an end date. Two price rows with overlapping start and end dates cause an error since we cannot determine a current sale price. We throw an error and stop execution in that case
- Once we've determined a current sale price, we prepare the update to algolia
- We send the current sale prices both in store and online along with original price and other searchable attributes to algolia
- After all messages are processed, any price rows that were successfully processed are marked as processed so that they won't be reprocessed later. If any failure occurs then they are flagged as "failure" and an alert is sent out (this is usually due to overlapping temporary markdowns that we cannot correct on our side)

## updateAlgoliaStyle
- `index.js` is the main file where execution starts
- First we filter all incoming messages, and remove any that are not from the styles topic and have a style id with a suffix of `-` followed by a number greater than zero (this suffix logic is only applicable for older styles where JESTA would append `-00` to each style id. Any number besides `00` meant to was not ready for display)
- The kafka messages are then transformed from JESTA named fields to appropriate mongo/algolia field names
- We fetch the relevant style data
- If the existing style data is more recent or outlet we ignore the kafka message
- We then make a single call to algolia sending all the style fields needed for search
