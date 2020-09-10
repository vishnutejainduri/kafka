# Algolia Fields and Processes

The platform builds and updates an algolia search index based on data contained within our MongoDB. The index is made up of style documents, where we sync all mongo related style fields with `updateAlgoliaStyle`. This is the base straightforward cloud function that simply creates style documents for algolia to index. There are a number of extra fields and jobs that create those fields. These are documented below.


For all our algolia updates we use a combination of a "queue" and a "job". The "queue" in these cases is actually a mongo collection of styles to process. The "job" is a cloud function that runs on a regular internal and processes styles from this mongo collection.

## Inventory Updates
For algolia inventory updates the `styleAvailabilityCheckQueue` is used as the "queue" collection. `updateAlgoliaInventory` is the cloud function that runs as the "job". Every minute `updateAlgoliaInventory` pulls 40 styles from the `styleAvailabilityCheckQueue` queue and determines what inventory related updates need to happen to that style in the algolia index. The following fields are handled in this update:

- `isAvailableToSell`
- `isOnlineAvailableToSell`
- `sizes`
- `onlineSizes`
- `storeInventory`
- `stores`

`isAvailableToSell` is determined by whether or not the product api returns an ats value greater than 0 for that style (we use the product api as it calculates the final ats and online ats values based on the raw data in mongo).
`isOnlineAvailableToSell` is determined by whether or not the product api returns an online ats value greater than 0 for that style.
`sizes` is determined by pulling all skus, and building an array of sizes (both english and french) for any sku that has ats greater than 0.
`onlineSizes` is determined by pulling all skus, and building an array of sizes (both english and french) for any sku that has online ats (minus reserved quantity) greater than 0.
`storeInventory` is a series of nested objects, where for each store we append all sizes (both english and french) that have a sku with ats greater than 0.
`stores` is an array of stores where this style is available (wherever a sku at a store id has ats greater than 0).

## Price Updates
For algolia price updates the `prices` collection is used as the "queue" collection. `updateAlgoliaPrice` is the cloud function that runs as the "job". Every minute `updateAlgoliaPrice` pulls 1000 styles from the `prices` queue collection and determines any sale prices to apply in algolia. The following fields are handled in this update:

- `originalPrice`
- `onlineSalePrice`
- `inStoreSalePrice`
- `isSale`
- `isOnlineSale`
- `lowestOnlinePrice`
- `lowestPrice`

`originalPrice` is simply the `originalPrice` field stored in the style document in the `styles` collection. We also save this to the matching pricing document in the `prices` collection.
`onlineSalePrice` is the currently active online sale price that the logic in `updateAlgoliaPrice` has determined based on what's present in the `priceChanges` array on the pricing document for that style in `prices`.
`onlineSalePrice` is the currently active in store only sale price that the logic in `updateAlgoliaPrice` has determined based on what's present in the `priceChanges` array on the pricing document for that style in `prices`.
`isSale` is a boolean flag for whether the style is on sale in store or not.
`isOnlineSale` is a boolean flag for whether the style is on sale online or not.
`lowestOnlinePrice` is the lowest price the style is currently selling at, excluding any in store only sale prices.
`lowestPrice` is the lowest price the style is currently selling at, across any possible sale prices applicable to the style in store included.

## Outlet Updates
For style outlet updates the `algoliaDeleteCreateQueue` collection is used as the "queue". `deleteCreateAlgoliaStyles` is the cloud function that runs as the "job". Every minute `deleteCreateAlgoliaStyles` pulls 200 styles from the queue collection and determines whether the style needs to be created or deleted from the algolia index based on it's outlet status. No fields are updated with this job, styles are only created or deleted based on their `isOutlet` status in the `styles` collection. If `isOutlet` has been changed to `true` it will be added to the `algoliaDeleteCreateQueue` and `deleteCreateAlgoliaStyles` will delete that style completely from the algolia index. If `isOutlet` has been changed to `false` it will be added to the `algoliaDeleteCreateQueue` and `deleteCreateAlgoliaStyles` will create that style from scratch in the algolia index based on the fields in the `styles` collection.

## Facet Updates
For style facets the `algoliaFacetBulkImportQueue` collection is used as the queue. `updateAlgoliaFacets` acts as the "job". Every minute `updateAlgoliaFacets` grabs 750 styles from the `algoliaFacetBulkImportQueue` and determines what facets need to be created, updated, or deleted. The following facet fields are handled by this job:

- `style`
- `fabric`
- `length`
- `fit`
- `collar`
- `pattern`
- `cuff`
- `microsite`

### Create/Update
For the `style`, `fabric`, `length`, `fit`, `collar`, `pattern`, and `cuff` facets creates and updates act the same. The field is by default null in algolia and whatever the current value for either of these fields are in the `styles` collection overwrites what is in the algolia index document.
For `microsite` we use the unique id `facetId` to determine whether we need to create a new microsite that should be added to the `microsite` array, or if we should update a value already inside the `microsite` array. We pull the `microsite` field from the `styles` collection, this `microsite` field differs from the one in algolia as it keeps track of all microsites by `facetId`. If the `facetId` does not exist we add it to the `microsite` field in algolia. If `facetId` exists, we update the value and rebuild the `microsite` array for algolia with that new value.

### Delete
Deletions for all facets is determined by the value of the `isMarkedForDeletion` flag. Algolia cannot delete a field in the strictest sense, we can only set it back to null which algolia treats as not existing. If any facet has `isMarkedForDeletion` as `true` we still send an update to algolia setting that facet to null. If it is a `microsite` we simply remove that `facetId` from the array. If `isMarkedForDeletion` is set to `false` we follow the above rules for Create/Update.

## Other
There are a few other algolia related mongo collections that we use. These are not for handling updates to algolia and do not serve as "queues". They are used to keep track of calls to algolia. Since we are charged by numbers of calls to algolia, we use these collections when we need to find out how many calls we are making for each of the above types of updates mentioned above. NOTE: These only exist because algolia does not provide analytics like this, only the total calls per day, not broken down by field. These collections allow us to find out which type of update is causing the most calls to algolia, acting essentially as a make shift analytics tool. The following collections are used for this:

- `createAlgoliaStylesCount` (number of style create operations we run)
- `deleteAlgoliaStylesCount` (number of style delete operations we run)
- `updateAlgoliaFacetsCount` (number of style facet create/update/deletes we run)
- `updateAlgoliaInventoryCount` (number of style inventory updates we run)
- `updateAlgoliaPriceCount` (number of style pricing updates we run)
- `updateAlgoliaStyleCount` (number of style updates we run, as part of the inital stage of creating a record in the algolia index)
