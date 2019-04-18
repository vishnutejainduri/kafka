#!/bin/bash
echo ">>> Downloading Whisk Deploy…"
wget https://github.com/apache/incubator-openwhisk-wskdeploy/releases/download/latest/openwhisk_wskdeploy-latest-linux-amd64.tgz
echo ">>> Installing Whisk Deploy…"
mkdir openwhisk
tar -zxvf ./openwhisk_wskdeploy-latest-linux-amd64.tgz -C ./openwhisk
rm -rd ./openwhisk_wskdeploy-latest-linux-amd64.tgz
echo ">>> Checking installed version of Whisk Deploy…"
./openwhisk/wskdeploy version
echo ">>> Checking installed version of IBM Cloud CLI…"
ibmcloud –-version
echo ">>> Logging into IBM Cloud…"
ibmcloud login --apikey $DEPLOYER_API_KEY -a api.ng.bluemix.net -o "Myplanet Harry Rosen" -s "Harry Rosen Dev Dallas"
echo ">>> Contents Of Manifest File:"
cat manifest.yaml
echo ">>> Currently Deployed Packages:"
ibmcloud wsk package list
echo ">>> Currently Deployed Actions:"
ibmcloud wsk action list
echo ">>> Currently Deployed Triggers:"
ibmcloud wsk trigger list
echo ">>> Currently Deployed Rules:"
ibmcloud wsk rule list
echo ">>> Building Actions packaged as modules:"
./build.sh
echo ">>> Deploying Actions Using WhiskDeploy…"
ALGOLIA_APP_ID=$ALGOLIA_APP_ID \
  ALGOLIA_API_KEY=$ALGOLIA_API_KEY \
  ALGOLIA_INDEX_NAME=$ALGOLIA_INDEX_NAME \
  FEED_BASE=$FEED_BASE \
  MONGO_URI=$MONGO_URI \
  DB_NAME=$DB_NAME \
  ./openwhisk/wskdeploy -p .
echo ">>> Successfully Deployed Actions Using WhiskDeploy."
