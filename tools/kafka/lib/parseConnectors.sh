
output=$(curl -s -H "Authorization: Bearer $SESSION_TOKEN" -X GET $KUBE_HOST/kafka-connect/connectors)

outputNoLeftBracket="${output//[/}"
outputNoRightBracket="${outputNoLeftBracket//]/}"

IFS=',' read -r -a array <<< "$outputNoRightBracket"

connectors=()
for element in "${array[@]}"
do
  elementNoQuotes="${element//\"/}"
  connectors+=("$elementNoQuotes")
done
