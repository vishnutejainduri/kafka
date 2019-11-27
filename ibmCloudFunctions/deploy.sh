#!/bin/bash
echo ">>> Logging into IBM Cloud…"
ibmcloud login --apikey $DEPLOYER_API_KEY -a cloud.ibm.com -r us-south -o "Myplanet Ltd" -s "Platform Dev Dallas"
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
ibmcloud fn deploy --project . --verbose
echo ">>> Successfully Deployed Actions Using WhiskDeploy."
