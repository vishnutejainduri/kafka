#!/bin/bash
echo ">>> Deploying commercetools CFs"
echo ">>> Logging into IBM Cloud…"
DEPLOYER_API_KEY=$1
ORG=$2" "$3
SPACE=$4" "$5" "$6
DEPLOY_TRIGGERS=$7
echo $DEPLOYER_API_KEY
echo $ORG
echo $SPACE
echo $DEPLOY_TRIGGERS
ibmcloud login --apikey $DEPLOYER_API_KEY -a cloud.ibm.com -r us-south -o "$ORG" -s "$SPACE"

echo ">>> Contents Of Manifest File:"
if [ $DEPLOY_TRIGGERS = "true" ]; then
	echo ">>> Deploy with Triggers"
	cat commercetools/manifest-package-ct.yaml commercetools/manifest-actions-ct.yaml commercetools/manifest-triggers-ct.yaml commercetools/manifest-rules-ct.yaml > manifest.yaml
else
	echo ">>> Deploy without Triggers"
	cat commercetools/manifest-package-ct.yaml commercetools/manifest-actions-ct.yaml commercetools/manifest-rules-ct.yaml > manifest.yaml
fi

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
#echo ">>> Deploying Actions Using WhiskDeploy again…"
#ibmcloud fn deploy --project .
#echo ">>> Successfully Deployed Actions Using WhiskDeploy."
echo ">>> Successfully Deployed Actions Using WhiskDeploy."
