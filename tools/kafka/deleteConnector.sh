. ./lib/getKubeEnv.sh $1
. ./lib/getSessionToken.sh $1 

connectors=()
connectors+=("skuinventory-jdbc-source-v21")

for connector in "${connectors[@]}"
do
  curl -H "Authorization: Bearer $SESSION_TOKEN" -X DELETE $KUBE_HOST/connectors/$connector
  echo "Deleting $connector"
  printf "\n"
done

echo "Done"
