This directory contains functions and config for OpenWhisk on the IBM Cloud.

# Config
- to view your IBM Cloud orgs: `ibmcloud account orgs`
- to view your IBM Cloud org spaces: `ibmcloud account spaces -o "<orgName>"`


# Deploying

Currently these functions must be manually deployed and configured.

1. Target the org and space: `ibmcloud target -o "<orgName>" -s "<spaceName>"`
2. Deploy the function: `ibmcloud fn action create <actionName> <filename> --kind nodejs:10`
3. Enter the configuration data for the params in `config.json`
4. Configure the function params: ` ibmcloud fn package update product-consumers --param-file config.json`
5. Select the right trigger: `ibmcloud fn trigger list`
6. Associate it with the action: `ibmcloud fn rule create <ruleName> <triggerName> <actionName>`