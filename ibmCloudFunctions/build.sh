#!/usr/bin/env bash
echo ">>> Building Action packages:"
cd updateAlgoliaInventory
npm install
npm run build
cd ../updateAlgoliaStyle
npm install
npm run build
cd ../consumeCatalogMessage/
npm install
npm run build
cd ../consumeSkuInventoryMessage/
npm install
npm run build
cd ../consumeSkuMessage
npm install
npm run build
cd ../updateSalePrice/
npm install
npm run build
cd ../updateAlgoliaPrice/
npm install
npm run build
cd ../updateAlgoliaImage/
npm install
npm run build
cd ../updateAlgoliaFacets/
npm install
npm run build
cd ../consumeMediasMessage/
npm install
npm run build
cd ../consumeMediaContainersMessage/
npm install
npm run build
cd ../consumeStoresMessage/
npm install
npm run build
cd ../addMediaContainerToQueue/
npm install
npm run build
cd ../addStyleInventoryCheckToQueue/
npm install
npm run build
cd ../addFacetsToBulkImportQueue/
npm install
npm run build
cd ..
echo ">>> Built Action packages"
