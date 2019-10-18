This directory contains K8s yaml files and scripts to deploy the Kafka Connect host, as well as configure kubernetes.

We use Kafka Connect to integrate legacy data sources on the on-prem Harry Rosen network with IBM Event Streams. Kafka
Connect is a tool that runs polling queries to determine if new data exists that must be emitted as messages on to Kafka
topics.

In this directory you'll find:
- `connectors` - connector configuration files
- `ibmCloudK8sVPN` - resources and instructions for setting up VPN connectivity to the on-prem Harry Rosen network
- `ibmCloudK8sIngress` - resources and instructions for setting up secure Ingress for Kafka Connect
- `kafkaConnectImage` - resources and instructions for building the Docker image for Kafka Connect
- `logging` - resources and instructions for setting up logging with LogDNA

When starting with a new cluster, you must:
1. set up VPN connectivity with the resources in the `ibmCloudK8sVPN` folder
2. set up Ingress with the resources in the `ibmCloudK8sIngress` folder.
3. deploy the connectors with the instructions below.

You must create the following topics in the target Event Streams:
- inventory-connect-jdbc-SKUINVENTORY
- styles-connect-jdbc-CATALOG
- TODO update

To configure the connection to our Event Streams, you'll need to have already created a set of service credentials
in the dashboard for the Event Streams service we're targeting.

Use the following command to create a secret in the cluster for the credentials and config. Remember to replace
- <user>
- <password>
- <boostrap_servers>
    - bootstrap servers must be formatted as "server:port,server:port"
below with those from the service credentials for Event Streams.
TODO: Change this to a script

kubectl create secret generic eventstreams-kafka-connect \
  --from-literal=CONNECT_BOOTSTRAP_SERVERS="kafka03-prod02.messagehub.services.us-south.bluemix.net:9093,kafka04-prod02.messagehub.services.us-south.bluemix.net:9093,kafka05-prod02.messagehub.services.us-south.bluemix.net:9093,kafka01-prod02.messagehub.services.us-south.bluemix.net:9093,kafka02-prod02.messagehub.services.us-south.bluemix.net:9093"   \
  --from-literal=CONNECT_REST_PORT=28083   \
  --from-literal=CONNECT_GROUP_ID="platform"   \
  --from-literal=CONNECT_CONFIG_STORAGE_TOPIC="platform-connect-config"   \
  --from-literal=CONNECT_OFFSET_STORAGE_TOPIC="platform-connect-offsets"   \
  --from-literal=CONNECT_STATUS_STORAGE_TOPIC="platform-connect-status"   \
  --from-literal=CONNECT_CONFIG_STORAGE_REPLICATION_FACTOR=3   \
  --from-literal=CONNECT_OFFSET_STORAGE_REPLICATION_FACTOR=3   \
  --from-literal=CONNECT_STATUS_STORAGE_REPLICATION_FACTOR=3   \
  --from-literal=CONNECT_KEY_CONVERTER="org.apache.kafka.connect.json.JsonConverter"   \
  --from-literal=CONNECT_VALUE_CONVERTER="org.apache.kafka.connect.json.JsonConverter"   \
  --from-literal=CONNECT_KEY_CONVERTER_SCHEMAS_ENABLE=false  \
  --from-literal=CONNECT_VALUE_CONVERTER_SCHEMAS_ENABLE=false  \
  --from-literal=CONNECT_INTERNAL_KEY_CONVERTER="org.apache.kafka.connect.json.JsonConverter"   \
  --from-literal=CONNECT_INTERNAL_VALUE_CONVERTER="org.apache.kafka.connect.json.JsonConverter"   \
  --from-literal=CONNECT_LOG4J_ROOT_LOGLEVEL=INFO   \
  --from-literal=CONNECT_KAFKA_LOG4J_ROOT_LOGLEVEL=INFO \
  --from-literal=CONNECT_CONNECT_LOG4J_ROOT_LOGLEVEL=INFO   \
  --from-literal=CONNECT_PLUGIN_PATH=/usr/share/java,/etc/kafka-connect/jars \
  --from-literal=CONNECT_SASL_JAAS_CONFIG='org.apache.kafka.common.security.plain.PlainLoginModule required username="sJ0KNFZTXobqHDs1" password="IwLvLbUnr8FP44m9RMfcvVP4LwbT3XZm";'  \
  --from-literal=CONNECT_SECURITY_PROTOCOL=SASL_SSL  \
  --from-literal=CONNECT_SASL_MECHANISM=PLAIN  \
  --from-literal=CONNECT_SSL_PROTOCOL=TLSv1.2  \
  --from-literal=CONNECT_SSL_ENABLED_PROTOCOLS=TLSv1.2  \
  --from-literal=CONNECT_SSL_ENDPOINT_IDENTIFICATION_ALGORITHM=HTTPS  \
  --from-literal=CONNECT_REQUEST_TIMEOUT_MS=900000 \
  --from-literal=CONNECT_PRODUCER_SASL_JAAS_CONFIG='org.apache.kafka.common.security.plain.PlainLoginModule required username="sJ0KNFZTXobqHDs1" password="IwLvLbUnr8FP44m9RMfcvVP4LwbT3XZm";'  \
  --from-literal=CONNECT_PRODUCER_SECURITY_PROTOCOL=SASL_SSL  \
  --from-literal=CONNECT_PRODUCER_SASL_MECHANISM=PLAIN  \
  --from-literal=CONNECT_PRODUCER_SSL_PROTOCOL=TLSv1.2  \
  --from-literal=CONNECT_PRODUCER_SSL_ENABLED_PROTOCOLS=TLSv1.2  \
  --from-literal=CONNECT_PRODUCER_SSL_ENDPOINT_IDENTIFICATION_ALGORITHM=HTTPS \
  --from-literal=CONNECT_PRODUCER_BUFFER_MEMORY=4000000 \
  --from-literal=CONNECT_PRODUCER_REQUEST_TIMEOUT_MS=900000 \
  --from-literal=CONNECT_BUFFER_MEMORY=4000000 \
  --from-literal=CONNECT_OFFSET_STORAGE_PARTITIONS=1

# staging
kubectl create secret generic eventstreams-kafka-connect \
  --from-literal=CONNECT_BOOTSTRAP_SERVERS="kafka01-prod02.messagehub.services.us-south.bluemix.net:9093,kafka04-prod02.messagehub.services.us-south.bluemix.net:9093,kafka03-prod02.messagehub.services.us-south.bluemix.net:9093,kafka05-prod02.messagehub.services.us-south.bluemix.net:9093,kafka02-prod02.messagehub.services.us-south.bluemix.net:9093"   \
  --from-literal=CONNECT_REST_PORT=28083   \
  --from-literal=CONNECT_GROUP_ID="platform"   \
  --from-literal=CONNECT_CONFIG_STORAGE_TOPIC="platform-connect-config"   \
  --from-literal=CONNECT_OFFSET_STORAGE_TOPIC="platform-connect-offsets"   \
  --from-literal=CONNECT_STATUS_STORAGE_TOPIC="platform-connect-status"   \
  --from-literal=CONNECT_CONFIG_STORAGE_REPLICATION_FACTOR=3   \
  --from-literal=CONNECT_OFFSET_STORAGE_REPLICATION_FACTOR=3   \
  --from-literal=CONNECT_STATUS_STORAGE_REPLICATION_FACTOR=3   \
  --from-literal=CONNECT_KEY_CONVERTER="org.apache.kafka.connect.json.JsonConverter"   \
  --from-literal=CONNECT_VALUE_CONVERTER="org.apache.kafka.connect.json.JsonConverter"   \
  --from-literal=CONNECT_KEY_CONVERTER_SCHEMAS_ENABLE=false  \
  --from-literal=CONNECT_VALUE_CONVERTER_SCHEMAS_ENABLE=false  \
  --from-literal=CONNECT_INTERNAL_KEY_CONVERTER="org.apache.kafka.connect.json.JsonConverter"   \
  --from-literal=CONNECT_INTERNAL_VALUE_CONVERTER="org.apache.kafka.connect.json.JsonConverter"   \
  --from-literal=CONNECT_LOG4J_ROOT_LOGLEVEL=INFO   \
  --from-literal=CONNECT_KAFKA_LOG4J_ROOT_LOGLEVEL=INFO \
  --from-literal=CONNECT_CONNECT_LOG4J_ROOT_LOGLEVEL=INFO   \
  --from-literal=CONNECT_PLUGIN_PATH=/usr/share/java,/etc/kafka-connect/jars \
  --from-literal=CONNECT_SASL_JAAS_CONFIG='org.apache.kafka.common.security.plain.PlainLoginModule required username="IjgbHlmYOUFuxiOp" password="A2BYpLuR4jQkh7KIyGY3jNE7Kt01Llbd";'  \
  --from-literal=CONNECT_SECURITY_PROTOCOL=SASL_SSL  \
  --from-literal=CONNECT_SASL_MECHANISM=PLAIN  \
  --from-literal=CONNECT_SSL_PROTOCOL=TLSv1.2  \
  --from-literal=CONNECT_SSL_ENABLED_PROTOCOLS=TLSv1.2  \
  --from-literal=CONNECT_SSL_ENDPOINT_IDENTIFICATION_ALGORITHM=HTTPS  \
  --from-literal=CONNECT_REQUEST_TIMEOUT_MS=900000 \
  --from-literal=CONNECT_PRODUCER_SASL_JAAS_CONFIG='org.apache.kafka.common.security.plain.PlainLoginModule required username="IjgbHlmYOUFuxiOp" password="A2BYpLuR4jQkh7KIyGY3jNE7Kt01Llbd";'  \
  --from-literal=CONNECT_PRODUCER_SECURITY_PROTOCOL=SASL_SSL  \
  --from-literal=CONNECT_PRODUCER_SASL_MECHANISM=PLAIN  \
  --from-literal=CONNECT_PRODUCER_SSL_PROTOCOL=TLSv1.2  \
  --from-literal=CONNECT_PRODUCER_SSL_ENABLED_PROTOCOLS=TLSv1.2  \
  --from-literal=CONNECT_PRODUCER_SSL_ENDPOINT_IDENTIFICATION_ALGORITHM=HTTPS \
  --from-literal=CONNECT_PRODUCER_BUFFER_MEMORY=4000000 \
  --from-literal=CONNECT_PRODUCER_REQUEST_TIMEOUT_MS=900000 \
  --from-literal=CONNECT_BUFFER_MEMORY=4000000 \
  --from-literal=CONNECT_OFFSET_STORAGE_PARTITIONS=1

Create the image (see /kafka-connect-image) and deploy a workload with it
kubectl apply -f kafka-connect-deployment/kafka-connect-deployment.yaml

TODO remove all this and replace with tooling
Create a connector by using the REST API:

See connectors.txt for connector definitions. To deploy connectors, use the Kakfa Connect REST API.
example calls:
*create new connector* curl -X POST -H "Content-Type: application/json" --data @kafka-connect-deployment/connectors/online-prices-jdbc-source.json http://$CONNECT_HOST:$CONNECT_PORT/connectors
*delete connector* curl -X DELETE http://$CONNECT_HOST:$CONNECT_PORT/connectors/online-prices-jdbc-source-2
*view all connectors* curl -X GET http://$CONNECT_HOST:$CONNECT_PORT/connectors/
*view connector status* curl -X GET http://$CONNECT_HOST:$CONNECT_PORT/connectors/elcat-catalog-jdbc-source/status
*restart connector (does not reset offsets)* curl -X POST http://$CONNECT_HOST:$CONNECT_PORT/connectors/online-prices-jdbc-source/restart

VERY IMPORTANT - Delete the NodePort ingress when setup is complete!
