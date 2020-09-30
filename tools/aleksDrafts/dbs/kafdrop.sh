KAFKA_PROPERTIES=$(cat kafka.properties | base64)
echo "$KAFKA_PROPERTIES"
docker run --rm -p 9000:9000 -e KAFKA_PROPERTIES="$KAFKA_PROPERTIES" obsidiandynamics/kafdrop
