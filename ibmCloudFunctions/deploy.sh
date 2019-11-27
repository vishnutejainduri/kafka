#!/bin/bash
echo ">>> Checking installed version of IBM Cloud CLI…"
ibmcloud –-version
echo ">>> Installing the Cloud Functions plug-in…"
ibmcloud plugin install cloud-functions
echo ">>> Logging into IBM Cloud…"
ibmcloud login --apikey $DEPLOYER_API_KEY -a api.ng.bluemix.net -o "Myplanet Harry Rosen" -s "Harry Rosen Dev Dallas"
echo ">>> Contents Of Manifest File:"
cat manifest.yaml
echo ">>> Currently Deployed Packages:"
ibmcloud fn package list
echo ">>> Currently Deployed Actions:"
ibmcloud fn action list
echo ">>> Currently Deployed Triggers:"
ibmcloud fn trigger list
echo ">>> Currently Deployed Rules:"
ibmcloud fn rule list
echo ">>> Deploying Actions Using WhiskDeploy…"
ALGOLIA_APP_ID=$ALGOLIA_APP_ID \
  ALGOLIA_API_KEY=$ALGOLIA_API_KEY \
  ALGOLIA_INDEX_NAME=$ALGOLIA_INDEX_NAME \
  FEED_BASE=$FEED_BASE \
  MONGO_URI=$MONGO_URI \
  DB_NAME=$DB_NAME \
  ibmcloud fn deploy --project . --verbose
echo ">>> Successfully Deployed Actions Using WhiskDeploy."
