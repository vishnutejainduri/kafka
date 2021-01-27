#!/bin/bash
echo ">>> Deploying narvar CFs"
echo ">>> Logging into IBM Cloud…"
DEPLOYER_API_KEY=$1
ORG=$2" "$3
SPACE=$4" "$5" "$6
RESOURCE_GROUP=$7
CLOUD_FUNCTIONS_NAMESPACE=$8
DEPLOY_TRIGGERS=$9
echo $DEPLOYER_API_KEY
echo $ORG
echo $SPACE
echo $RESOURCE_GROUP
echo $CLOUD_FUNCTIONS_NAMESPACE
echo $DEPLOY_TRIGGERS
ibmcloud login --apikey $DEPLOYER_API_KEY -a cloud.ibm.com -r us-south -o "$ORG" -s "$SPACE"
ibmcloud target -g $RESOURCE_GROUP
ibmcloud fn property set --namespace $CLOUD_FUNCTIONS_NAMESPACE

echo ">>> Contents Of Manifest File:"
cat narvar/manifest-package-ct.yaml narvar/manifest-actions-ct.yaml > manifest.yaml

echo ">>> Currently Deployed Packages:"
ibmcloud fn package list
echo ">>> Currently Deployed Actions:"
ibmcloud fn action list
echo ">>> Currently Deployed Triggers:"
ibmcloud fn trigger list
echo ">>> Currently Deployed Rules:"
ibmcloud fn rule list
echo ">>> Deploying Actions Using WhiskDeploy…"
ibmcloud fn deploy --project .  -d -v
echo ">>> Successfully Deployed Actions Using WhiskDeploy."
