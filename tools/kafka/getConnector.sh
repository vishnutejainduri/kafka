. ./lib/getKubeEnv.sh $1
. ./lib/getSessionToken.sh $1

connectors=()
connectors+=("elcat-catalog-update-jdbc-source-v3")

for connector in "${connectors[@]}"
do
  curl -H "Authorization: Bearer $SESSION_TOKEN" -X GET $KUBE_HOST/connectors/$connector
  printf "\n"
done
