#!/usr/bin/env bash
echo ">>> Building Action packages:"
find alert-checks/* -maxdepth 0 -type d \( ! -name . \) -exec bash -c "cd '{}' && pwd && npm install && npm run build" \;
find product-consumers/* -maxdepth 0 -type d \( ! -name . \) -exec bash -c "cd '{}' && pwd && npm install && npm run build" \;
echo ">>> Built Action packages"
