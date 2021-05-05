. ./lib/getKubeEnv.sh $1
. ./lib/getSessionToken.sh $1 

connectors=()
connectors+=("connector-name-with-version")

for connector in "${connectors[@]}"
do
  curl -H "Authorization: Bearer $SESSION_TOKEN" -X DELETE $KUBE_HOST/kafka-connect/connectors/$connector
  echo "Deleting $connector"
  printf "\n"
done

echo "Done"
