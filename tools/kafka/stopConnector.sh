. ./lib/getKubeEnv.sh $1
. ./lib/getSessionToken.sh $1 

connectors=()
connectors+=("inventory-fast-load-jdbc-v16")

for connector in "${connectors[@]}"
do
  curl -H "Authorization: Bearer $SESSION_TOKEN" -X PUT $KUBE_HOST/connectors/$connector/pause
  echo "Stopping $connector"
  printf "\n"
done

echo "Done"

