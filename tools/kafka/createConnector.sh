. ./lib/getKubeEnv.sh $1
. ./lib/getSessionToken.sh $1 
. ./lib/getConnectorFileName.sh $2

connectors=()
connectors+=($CONNECTOR_FILE_NAME)

DEPLOY_PATH=$HR_PLATORM_PATH'/kafkaConnectDeployment/connectors/'
for connector in "${connectors[@]}"
do
  CONNECTOR_PATH="$DEPLOY_PATH""$connector"
  printf "\n"
  echo $CONNECTOR_PATH
  echo "Creating $connector"
  printf "\n"
  curl -H "Content-Type: application/json" -H "Authorization: Bearer $SESSION_TOKEN" -X POST --data @$CONNECTOR_PATH $KUBE_HOST/kafka-connect/connectors
  printf "\n"
  printf "\n"
done

echo "Done"
