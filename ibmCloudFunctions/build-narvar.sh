#!/usr/bin/env bash
echo ">>> Building Action packages:"
cd lib && npm install && cd .. && cd narvar && npm install && cd ..
find narvar/* -maxdepth 0 -type d \( ! -name . \) -exec bash -c "cd '{}' && pwd && npm install && npm run build" \;
echo ">>> Built Action packages"
