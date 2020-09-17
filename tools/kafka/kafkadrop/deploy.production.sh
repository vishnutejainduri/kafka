docker run -d --rm -p 9007:9000 -e KAFKA_PROPERTIES=$(cat production.env | base64) obsidiandynamics/kafdrop
