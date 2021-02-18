. ./lib/getKafkaEnv.sh $1
. ./lib/getTopicName.sh $2

echo 'Getting '$TOPIC_NAME' from '$1

./kafka-tools/bin/kafka-console-consumer.sh --bootstrap-server $KAFKA_BROKERS --from-beginning --consumer-property sasl.jaas.config="org.apache.kafka.common.security.plain.PlainLoginModule required username=\"$KAFKA_USERNAME\" password=\"$KAFKA_PASSWORD\";"    --consumer-property security.protocol=SASL_SSL    --consumer-property sasl.mechanism=PLAIN    --consumer-property ssl.protocol=TLSv1.2    --consumer-property ssl.enabled.protocols=TLSv1.2    --consumer-property ssl.endpoint.identification.algorithm=HTTPS --topic $TOPIC_NAME
