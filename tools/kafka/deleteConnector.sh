. ./lib/getKubeEnv.sh $1
. ./lib/getSessionToken.sh $1 

connectors=()
connectors+=("elcat-stylecolours-update-jdbc-source-v2")
connectors+=("elcat-catalog-update-jdbc-source-v6")
connectors+=("elcat-catalog-create-jdbc-source-v2")

for connector in "${connectors[@]}"
do
  curl -H "Authorization: Bearer $SESSION_TOKEN" -X DELETE $KUBE_HOST/connectors/$connector
  echo "Deleting $connector"
  printf "\n"
done

echo "Done"
