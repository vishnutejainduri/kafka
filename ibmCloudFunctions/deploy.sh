#!/bin/bash
echo ">>> Logging into IBM Cloud…"
ibmcloud login --apikey $DEPLOYER_API_KEY -a cloud.ibm.com -r us-south -o $ORG -s $SPACE
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
ibmcloud fn deploy --project .
# We deploy twice because if run only once for some reason the triggers do not fire the CFs"
echo ">>> Deploying Actions Using WhiskDeploy again…"
ibmcloud fn deploy --project .
echo ">>> Successfully Deployed Actions Using WhiskDeploy."
