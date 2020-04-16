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
1. set up VPN connectivity with the resources in the `ibmCloudK8sVPN` folder (Note: You'll need to contact HR and provide them with the IPs of the cluster to whitelist them)
2. set up Ingress with the resources in the `ibmCloudK8sIngress` folder.
3. deploy the connectors with the instructions below.

You must create the following topics in the target Event Streams:
- inventory-connect-jdbc-SKUINVENTORY
- styles-connect-jdbc-CATALOG
- TODO update

To configure the connection to our Event Streams, you'll need to have already created a set of service credentials
in the dashboard for the Event Streams service we're targeting.

# Configuring Kafka Connect
Kafka Connect docker image reads environmental variables starting with 'CONNECT' to set its configuration:
- implementation: https://github.com/confluentinc/cp-docker-images/blob/5.3.1-post/debian/kafka-connect-base/include/etc/confluent/docker/kafka-connect.properties.template
- guide: https://docs.confluent.io/current/installation/docker/config-reference.html#kafka-connect-configuration
 
To set the environmental variables, we create a secret called 'eventstreams-kafka-connect' inside our cluster which is then referenced by 'kafka-connect-deployment.yaml'.

*Note* Secret should be created before deploying the manifest. To define a container environment variable with data from a single Secret see:
- guide: https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/#define-a-container-environment-variable-with-data-from-a-single-secret

*Note* Kafka Connect docker deployments uses Distributed Mode, so all of the properties relevant to this mode can be set:
- implementation: https://github.com/confluentinc/cp-docker-images/blob/fec6d0a8635cea1dd860e610ac19bd3ece8ad9f4/debian/kafka-connect-base/include/etc/confluent/docker/launch#L42
- guide: https://docs.confluent.io/current/connect/userguide.html#distributed-mode
- guide: https://docs.confluent.io/current/connect/userguide.html#distributed-worker-configuration
- guide: https://gerardnico.com/dit/kafka/connect/distributed

Use the following command to create a secret in the cluster for the credentials and config. Remember to replace
- <user>
- <password>
- <boostrap_servers>
    - bootstrap servers must be formatted as "server:port,server:port"
below with those from the service credentials for Event Streams.
TODO: Change this to a script

*Note* Parameters that change by the environment:
- CONNECT_BOOTSTRAP_SERVERS
- CONNECT_SASL_JAAS_CONFIG
- CONNECT_PRODUCER_SASL_JAAS_CONFIG

## development
```bash
kubectl create secret generic eventstreams-kafka-connect \
  --from-literal=CONNECT_BOOTSTRAP_SERVERS="broker-1-2tfntg0sj88sy590.kafka.svc02.us-south.eventstreams.cloud.ibm.com:9093,broker-3-2tfntg0sj88sy590.kafka.svc02.us-south.eventstreams.cloud.ibm.com:9093,broker-0-2tfntg0sj88sy590.kafka.svc02.us-south.eventstreams.cloud.ibm.com:9093,broker-4-2tfntg0sj88sy590.kafka.svc02.us-south.eventstreams.cloud.ibm.com:9093,broker-2-2tfntg0sj88sy590.kafka.svc02.us-south.eventstreams.cloud.ibm.com:9093,broker-5-2tfntg0sj88sy590.kafka.svc02.us-south.eventstreams.cloud.ibm.com:9093"   \
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
  --from-literal=CONNECT_SASL_JAAS_CONFIG='org.apache.kafka.common.security.plain.PlainLoginModule required username="token" password="py_8snyJNHisgbKpvebwD4aSrMO3VzqG_Lz6zR8eDkwo";'  \
  --from-literal=CONNECT_SECURITY_PROTOCOL=SASL_SSL  \
  --from-literal=CONNECT_SASL_MECHANISM=PLAIN  \
  --from-literal=CONNECT_SSL_PROTOCOL=TLSv1.2  \
  --from-literal=CONNECT_SSL_ENABLED_PROTOCOLS=TLSv1.2  \
  --from-literal=CONNECT_SSL_ENDPOINT_IDENTIFICATION_ALGORITHM=HTTPS  \
  --from-literal=CONNECT_PRODUCER_SASL_JAAS_CONFIG='org.apache.kafka.common.security.plain.PlainLoginModule required username="user" password="py_8snyJNHisgbKpvebwD4aSrMO3VzqG_Lz6zR8eDkwo";'  \
  --from-literal=CONNECT_PRODUCER_SECURITY_PROTOCOL=SASL_SSL  \
  --from-literal=CONNECT_PRODUCER_SASL_MECHANISM=PLAIN  \
  --from-literal=CONNECT_PRODUCER_SSL_PROTOCOL=TLSv1.2  \
  --from-literal=CONNECT_PRODUCER_SSL_ENABLED_PROTOCOLS=TLSv1.2  \
  --from-literal=CONNECT_PRODUCER_SSL_ENDPOINT_IDENTIFICATION_ALGORITHM=HTTPS \
  --from-literal=CONNECT_OFFSET_STORAGE_PARTITIONS=1
```

## staging
```bash
kubectl create secret generic eventstreams-kafka-connect-standard \
  --from-literal=CONNECT_BOOTSTRAP_SERVERS="broker-1-td05h9dhfzqh2zyq.kafka.svc03.us-south.eventstreams.cloud.ibm.com:9093,broker-5-td05h9dhfzqh2zyq.kafka.svc03.us-south.eventstreams.cloud.ibm.com:9093,broker-4-td05h9dhfzqh2zyq.kafka.svc03.us-south.eventstreams.cloud.ibm.com:9093,broker-3-td05h9dhfzqh2zyq.kafka.svc03.us-south.eventstreams.cloud.ibm.com:9093,broker-0-td05h9dhfzqh2zyq.kafka.svc03.us-south.eventstreams.cloud.ibm.com:9093,broker-2-td05h9dhfzqh2zyq.kafka.svc03.us-south.eventstreams.cloud.ibm.com:9093"   \
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
  --from-literal=CONNECT_SASL_JAAS_CONFIG='org.apache.kafka.common.security.plain.PlainLoginModule required username="token" password="t3YcCPZXXn4eUEIvVxFnHtlLZSQ63vFsZVL-PZLHxYnz";'  \
  --from-literal=CONNECT_SECURITY_PROTOCOL=SASL_SSL  \
  --from-literal=CONNECT_SASL_MECHANISM=PLAIN  \
  --from-literal=CONNECT_SSL_PROTOCOL=TLSv1.2  \
  --from-literal=CONNECT_SSL_ENABLED_PROTOCOLS=TLSv1.2  \
  --from-literal=CONNECT_SSL_ENDPOINT_IDENTIFICATION_ALGORITHM=HTTPS  \
  --from-literal=CONNECT_PRODUCER_SASL_JAAS_CONFIG='org.apache.kafka.common.security.plain.PlainLoginModule required username="token" password="t3YcCPZXXn4eUEIvVxFnHtlLZSQ63vFsZVL-PZLHxYnz";'  \
  --from-literal=CONNECT_PRODUCER_SECURITY_PROTOCOL=SASL_SSL  \
  --from-literal=CONNECT_PRODUCER_SASL_MECHANISM=PLAIN  \
  --from-literal=CONNECT_PRODUCER_SSL_PROTOCOL=TLSv1.2  \
  --from-literal=CONNECT_PRODUCER_SSL_ENABLED_PROTOCOLS=TLSv1.2  \
  --from-literal=CONNECT_PRODUCER_SSL_ENDPOINT_IDENTIFICATION_ALGORITHM=HTTPS \
  --from-literal=CONNECT_OFFSET_STORAGE_PARTITIONS=1
```

## production
```bash
kubectl create secret generic eventstreams-kafka-connect-standard \
  --from-literal=CONNECT_BOOTSTRAP_SERVERS="broker-5-gpn77dfqwbstgywk.kafka.svc03.us-south.eventstreams.cloud.ibm.com:9093",
    "broker-4-gpn77dfqwbstgywk.kafka.svc03.us-south.eventstreams.cloud.ibm.com:9093",
    "broker-3-gpn77dfqwbstgywk.kafka.svc03.us-south.eventstreams.cloud.ibm.com:9093",
    "broker-1-gpn77dfqwbstgywk.kafka.svc03.us-south.eventstreams.cloud.ibm.com:9093",
    "broker-0-gpn77dfqwbstgywk.kafka.svc03.us-south.eventstreams.cloud.ibm.com:9093",
    "broker-2-gpn77dfqwbstgywk.kafka.svc03.us-south.eventstreams.cloud.ibm.com:9093"   \
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
  --from-literal=CONNECT_SASL_JAAS_CONFIG='org.apache.kafka.common.security.plain.PlainLoginModule required username="token" password="C5QCCPl5XV9dZTpFRVvwHWZDiPM-_cNG3PGS-5Gl9QQ9";'  \
  --from-literal=CONNECT_SECURITY_PROTOCOL=SASL_SSL  \
  --from-literal=CONNECT_SASL_MECHANISM=PLAIN  \
  --from-literal=CONNECT_SSL_PROTOCOL=TLSv1.2  \
  --from-literal=CONNECT_SSL_ENABLED_PROTOCOLS=TLSv1.2  \
  --from-literal=CONNECT_SSL_ENDPOINT_IDENTIFICATION_ALGORITHM=HTTPS  \
  --from-literal=CONNECT_PRODUCER_SASL_JAAS_CONFIG='org.apache.kafka.common.security.plain.PlainLoginModule required username="token" password="C5QCCPl5XV9dZTpFRVvwHWZDiPM-_cNG3PGS-5Gl9QQ9";'  \
  --from-literal=CONNECT_PRODUCER_SECURITY_PROTOCOL=SASL_SSL  \
  --from-literal=CONNECT_PRODUCER_SASL_MECHANISM=PLAIN  \
  --from-literal=CONNECT_PRODUCER_SSL_PROTOCOL=TLSv1.2  \
  --from-literal=CONNECT_PRODUCER_SSL_ENABLED_PROTOCOLS=TLSv1.2  \
  --from-literal=CONNECT_PRODUCER_SSL_ENDPOINT_IDENTIFICATION_ALGORITHM=HTTPS \
  --from-literal=CONNECT_OFFSET_STORAGE_PARTITIONS=1
```

# Creating Kafka Connect Service 
kubectl apply -f ./kafka-connect-service.yaml

# Deploying Kafka Connect
Create the image (see /kafka-connect-image) and deploy a workload with it
kubectl apply -f ./kafka-connect-deployment.yaml

*Note* Remember to specify Kafka Connect image tag in 'kafka-connect-deployment.yaml'

*Note* To allow the cluster pull images from IBM container registry, 'Image Pull Secrets' from 'Overview' tab of the cluster on IBM Cloud UI should be enabled. Alaternatively, follow:
- https://cloud.ibm.com/docs/containers?topic=containers-images#imagePullSecret_migrate_api_key

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
*Note* There is no need to deploy NodePort if you have successfully setup Ingress; NodePort is only for testing purposes.

# Troubleshooting
- If Kafka Connect cannot create the initial topics by itself, they can be manually created:
  - $: ibmcloud es topic-create --name platform-connect-offsets -p 25 --config cleanup.policy="compact,delete" --config retention.ms=-1
  - $: ibmcloud es topic-create --name platform-connect-status -p 5 --config cleanup.policy="compact,delete" --config retention.ms=-1
  - $: ibmcloud es topic-create --name platform-connect-config --config cleanup.policy="compact,delete" --config retention.ms=-1 