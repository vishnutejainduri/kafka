#!/bin/bash
echo ">>> Logging into IBM Cloud…"
DEPLOYER_API_KEY=$1
ORG=$2" "$3
SPACE=$4" "$5" "$6
SPACE=$7
DEPLOY_TRIGGERS=$8
echo $DEPLOYER_API_KEY
echo $ORG
echo $SPACE
echo $CLOUD_FUNCTIONS_NAMESPACE
echo $DEPLOY_TRIGGERS
ibmcloud login --apikey $DEPLOYER_API_KEY -a cloud.ibm.com -r us-south -o "$ORG" -s "$SPACE"
ibmcloud fn property set --namespace $CLOUD_FUNCTIONS_NAMESPACE
echo ">>> Contents Of Manifest File:"
if [ $DEPLOY_TRIGGERS = "true" ]; then
	echo ">>> Deploy with Triggers"
	cat manifest-package.yaml manifest-actions.yaml manifest-triggers.yaml manifest-rules.yaml > manifest.yaml
else
	echo ">>> Deploy without Triggers"
	cat manifest-package.yaml manifest-actions.yaml manifest-rules.yaml > manifest.yaml
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
ibmcloud fn deploy --project .  -d -v
#We deploy twice because if run only once for some reason the triggers do not fire the CFs"
#echo ">>> Deploying Actions Using WhiskDeploy again…"
#ibmcloud fn deploy --project .  -d -v
echo ">>> Successfully Deployed Actions Using WhiskDeploy."
