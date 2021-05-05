. ./lib/getKubeEnv.sh $1
. ./lib/getSessionToken.sh $1

connectors=()
connectors+=("connector-name-with-version")

for connector in "${connectors[@]}"
do
  curl -H "Authorization: Bearer $SESSION_TOKEN" -X GET $KUBE_HOST/kafka-connect/connectors/$connector
  printf "\n"
done
