. ./lib/getKubeEnv.sh $1
. ./lib/getSessionToken.sh $1 
. ./lib/parseConnectors.sh $1

for connector in "${connectors[@]}"
do
  echo "${connector}"
done
