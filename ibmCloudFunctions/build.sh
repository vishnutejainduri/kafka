#!/usr/bin/env bash
echo ">>> Building Action packages:"
cd updateAlgoliaInventory
npm install
npm run build
cd ../updateAlgoliaStyle
npm install
npm run build
cd ..
echo ">>> Built Action packages"
