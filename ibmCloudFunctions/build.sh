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
cd ..
echo ">>> Built Action packages"
