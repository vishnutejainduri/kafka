. ./lib/getKubeEnv.sh $1
. ./lib/getSessionToken.sh $1 

connectors=()
connectors+=("connector-name-with-version")

for connector in "${connectors[@]}"
do
  curl -H "Authorization: Bearer $SESSION_TOKEN" -X PUT $KUBE_HOST/connectors/$connector/resume
  echo "Resuming $connector"
  printf "\n"
done

echo "Done"
