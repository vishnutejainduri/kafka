#CREATE

#ALGOLIA FACETS
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create algoliaFacets ../../hr-platform/ibmCloudFunctions/product-consumers/updateAlgoliaFacets/dist/bundle.js

#FACET QUEUE
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create facetQueue ../../hr-platform/ibmCloudFunctions/product-consumers/addFacetsToBulkImportQueue/dist/bundle.js

#REMOVED QUANTITY RESERVED
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create removedQuantityReserved ../../hr-platform/ibmCloudFunctions/product-consumers/removeQuantityReserved/dist/bundle.js

#CT SHIPMENTS
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create shipmentsCt ../../hr-platform/ibmCloudFunctions/commercetools/consumeShipmentMessageCT/dist/bundle.js

#CT SHIPMENT DETAILS
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create shipmentDetailsCt ../../hr-platform/ibmCloudFunctions/commercetools/consumeShipmentDetailsMessageCT/dist/bundle.js

#CT ORDERS
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create salesordersDetailsCt ../../hr-platform/ibmCloudFunctions/commercetools/consumeSalesOrderDetailsMessageCT/dist/bundle.js

#CT ORDERS
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create salesordersCt ../../hr-platform/ibmCloudFunctions/commercetools/consumeSalesOrderMessageCT/dist/bundle.js

#CT FACETS
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create facetsCt ../../hr-platform/ibmCloudFunctions/commercetools/consumeFacetsMessageCT/dist/bundle.js

#CT BARCODES
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create barcodesCT ../../hr-platform/ibmCloudFunctions/commercetools/consumeBarcodeMessageCT/dist/bundle.js

#CT SKUS
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create skusCT ../../hr-platform/ibmCloudFunctions/commercetools/consumeSkuMessageCT/dist/bundle.js

#CT STYLES BASIC
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create stylesbasicCT ../../hr-platform/ibmCloudFunctions/commercetools/consumeStylesBasicMessageCT/dist/bundle.js

#CT PRICE
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create priceCT ../../hr-platform/ibmCloudFunctions/commercetools/consumeSalePriceCT/dist/bundle.js

#CT CATALOG
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create stylesUpdateCT ../../hr-platform/ibmCloudFunctions/commercetools/consumeCatalogMessageCT/dist/bundle.js

#BULK ATS
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create bulkinvats ../../hr-platform/ibmCloudFunctions/product-consumers/bulkCalculateAvailableToSell/dist/bundle.js

#THRESHOLD
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create threshold ../../hr-platform/ibmCloudFunctions/product-consumers/consumeThresholdMessage/dist/bundle.js
#INVENTORY
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create inventory ../../hr-platform/ibmCloudFunctions/product-consumers/consumeSkuInventoryMessage/dist/bundle.js
#ATS
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create ats ../../hr-platform/ibmCloudFunctions/product-consumers/calculateAvailableToSell/dist/bundle.js
#INVATS
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create invats --sequence inventory,ats
#DELETE INVENTORY
#wsk -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create deleteinventory ../../hr-platform/ibmCloudFunctions/cleanUpOutletSkuInventoryMessage/dist/bundle.js
#ALGOLIA UPDATE INVENTORY
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create algoliainventory --timeout 300000 ../../hr-platform/ibmCloudFunctions/product-consumers/updateAlgoliaInventory/dist/bundle.js
#ADD TO ALGOLIA INV QUEUE
#wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create invqueue ../../hr-platform/ibmCloudFunctions/product-consumers/addStyleInventoryCheckToQueue/dist/bundle.js
#ALGOLIA DELETE INVENTORY
#wsk -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create deletealgoliainventory ../../hr-platform/ibmCloudFunctions/removeOutletAlgoliaStyles/dist/bundle.js
#DEP 27 FULFILL
#wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create dep27fulfill ../../hr-platform/ibmCloudFunctions/product-consumers/consumeDep27FulfillMessage/dist/bundle.js
#STORES CF
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create stores ../../hr-platform/ibmCloudFunctions/product-consumers/consumeStoresMessage/dist/bundle.js
#ATS #wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create availabletosell ../../hr-platform/ibmCloudFunctions/calculateAvailableToSell/dist/bundle.js
#SKU
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create sku ../../hr-platform/ibmCloudFunctions/product-consumers/consumeSkuMessage/dist/bundle.js

#BARCODE
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create barcode ../../hr-platform/ibmCloudFunctions/product-consumers/consumeBarcodeMessage/dist/bundle.js

#STYLES BASIC
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create stylesbasic ../../hr-platform/ibmCloudFunctions/product-consumers/consumeStylesBasicMessage/dist/bundle.js

#ALGOLIA STYLES BASIC
#wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create algoliastylesbasic ../../hr-platform/ibmCloudFunctions/product-consumers/deleteCreateAlgoliaStyles/dist/bundle.js

#ALGOLIA STYLES
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create algoliastyles ../../hr-platform/ibmCloudFunctions/product-consumers/updateAlgoliaStyle/dist/bundle.js


#STYLES
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create styles ../../hr-platform/ibmCloudFunctions/product-consumers/consumeCatalogMessage/dist/bundle.js

#MEDIAS
#wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create medias ../../hr-platform/ibmCloudFunctions/product-consumers/consumeMediasMessage/dist/bundle.js
#API STATUS
#wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create statusapi ../../hr-platform/ibmCloudFunctions/statusDataApi/dist/bundle.js --web true -p productApiClientId "4fc13095-72ac-405a-ad4d-ea443d1686f0" -p productApiHost "http://172.16.3.12:5000"

#CT UPDATE SALE PRICE
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create ctprice ../../hr-platform/ibmCloudFunctions/commercetools/updateCTSalePrice/dist/bundle.js
#ALGOLIA UPDATE SALE PRICE
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create algoliaprice ../../hr-platform/ibmCloudFunctions/product-consumers/updateAlgoliaPrice/dist/bundle.js
#UPDATE SALE PRICE
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create price ../../hr-platform/ibmCloudFunctions/product-consumers/consumeSalePrice/dist/bundle.js
#PRICING
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create pricing --sequence algoliaprice,price

#RESOLVE MESSAGES
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create resolve-messages ../../hr-platform/ibmCloudFunctions/product-consumers/resolveMessagesLogs/dist/bundle.js

#CLEANUP MESSAGES
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create cleanup-messages ../../hr-platform/ibmCloudFunctions/product-consumers/cleanupMessagesLogs/dist/bundle.js

#CATALOG-CT AND CT-PRICE
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create catalogpricect --sequence stylesUpdateCT,ctprice

#CATALOG AND ALGOLIA-PRICE
wsk --apihost localhost -u 789c46b1-71f6-4ed5-8c54-816aa4f8c502:abczO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP -i action create catalogprice --sequence styles,algoliaprice
