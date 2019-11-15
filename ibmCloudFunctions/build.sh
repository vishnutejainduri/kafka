#!/usr/bin/env bash
echo ">>> Building Action packages:"
npm install ibmcloudfunctions/lib
find product-consumers/* -maxdepth 0 -type d \( ! -name . \) -exec bash -c "cd '{}' && pwd && npm install && npm run build" \;
echo ">>> Built Action packages"
