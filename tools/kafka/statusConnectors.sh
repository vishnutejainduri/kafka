. ./lib/getKubeEnv.sh $1
. ./lib/getSessionToken.sh $1 
. ./lib/parseConnectors.sh $1

for connector in "${connectors[@]}"
do
  curl -H "Authorization: Bearer $SESSION_TOKEN" -X GET $KUBE_HOST/kafka-connect/connectors/$connector/status
  printf "\n"
done
