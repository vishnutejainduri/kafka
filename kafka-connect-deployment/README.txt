This folder contains K8s yaml files and scripts to deploy the Kafka Connect host.

You must create the following topics in the target Event Streams:
- inventory-connect-jdbc-SKUINVENTORY
- styles-connect-jdbc-CATALOG

Use the following command to create a secret in the cluster for the credentials and config. Remember to replace <user>
and <password> below with those from the service credentials for Event Streams. Also update the bootstrap servers if necessary.
TODO: Change this to a script

kubectl create secret generic eventstreams-kafka-connect \
  --from-literal=CONNECT_BOOTSTRAP_SERVERS="kafka01-prod02.messagehub.services.us-south.bluemix.net:9093,kafka04-prod02.messagehub.services.us-south.bluemix.net:9093,kafka02-prod02.messagehub.services.us-south.bluemix.net:9093,kafka05-prod02.messagehub.services.us-south.bluemix.net:9093,kafka03-prod02.messagehub.services.us-south.bluemix.net:9093"   \
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
  --from-literal=CONNECT_CONNECT_LOG4J_ROOT_LOGLEVEL=DEBUG   \
  --from-literal=CONNECT_PLUGIN_PATH=/usr/share/java,/etc/kafka-connect/jars \
  --from-literal=CONNECT_SASL_JAAS_CONFIG='org.apache.kafka.common.security.plain.PlainLoginModule required username="<username>" password="<password>";'  \
  --from-literal=CONNECT_SECURITY_PROTOCOL=SASL_SSL  \
  --from-literal=CONNECT_SASL_MECHANISM=PLAIN  \
  --from-literal=CONNECT_SSL_PROTOCOL=TLSv1.2  \
  --from-literal=CONNECT_SSL_ENABLED_PROTOCOLS=TLSv1.2  \
  --from-literal=CONNECT_SSL_ENDPOINT_IDENTIFICATION_ALGORITHM=HTTPS  \
  --from-literal=CONNECT_PRODUCER_SASL_JAAS_CONFIG='org.apache.kafka.common.security.plain.PlainLoginModule required username="<username>" password="<password>";'  \
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

Open a NodePort ingress to the Connect host's REST API: https://cloud.ibm.com/docs/containers?topic=containers-nodeport#nodeport
VERY IMPORTANT - Delete the NodePort ingress when setup is complete!

Create a connector by using the REST API
CONNECT_HOST=<public ip for a node in the cluster>
CONNECT_PORT=<port set when creating NodePort ingress above>

# ELCAT.CATALOG with facet data connector
curl -X POST   -H "Content-Type: application/json" \
  --data '{ "name": "elcat-catalog-jdbc-source",
  "config": { "connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector",
  "tasks.max": 1,
  "connection.url": "jdbc:oracle:thin:myplanet/m1pl2n3t@//142.215.51.80:1521/beantstl",
  "mode": "timestamp",
  "batch.max.rows": 100,
  "timestamp.column.name": "EFFECTIVE_DATE",
  "topic.prefix": "styles-connect-jdbc-CATALOG",
  "validate.non.null": "false",
  "errors.log.enable": true,
  "numeric.mapping": "best_fit",
  "query": "SELECT * FROM ELCAT.CATALOG LEFT JOIN ( SELECT STYLEID AS FACET_STYLEID, LISTAGG(CATEGORY || '\'':'\'' || DESC_ENG, '\'','\'') WITHIN GROUP (ORDER BY CATEGORY) AS FACETS_ENG, LISTAGG(CATEGORY || '\'':'\'' || DESC_FR, '\'','\'') WITHIN GROUP (ORDER BY CATEGORY) AS FACETS_FR FROM ELCAT.STYLE_ITEM_CHARACTERISTICS_ECA GROUP BY STYLEID ) FACETS ON CATALOG.STYLEID LIKE FACETS.FACET_STYLEID || '\''%'\''",
  "poll.interval.ms": 120000,
  "offset.flush.timeout.ms": 120000,
  "request.timeout.ms": 900000,
  "producer.request.timeout.ms": 900000
  } }' \
  http://$CONNECT_HOST:$CONNECT_PORT/connectors

# MERCH.IRO_POS_PRICES - current day in-store sale price connector
curl -X POST   -H "Content-Type: application/json" \
  --data '{ "name": "in-store-prices-jdbc-source",
  "config": { "connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector",
  "tasks.max": 1,
  "connection.url": "jdbc:oracle:thin:myplanet/M1P12n3t@//142.215.51.103:1521/MTST",
  "mode": "bulk",
  "batch.max.rows": 1000,
  "topic.prefix": "prices-connect-jdbc",
  "validate.non.null": "false",
  "errors.log.enable": true,
  "numeric.mapping": "best_fit",
  "query": "SELECT IRO_POS_STYLES.STYLE_ID, NEW_RETAIL_PRICE, START_DATE, SITE_ID FROM MERCH.IRO_POS_STYLES LEFT JOIN (SELECT ipp.STYLE_ID, ipp.NEW_RETAIL_PRICE, ipp.START_DATE, ipp.SITE_ID FROM (SELECT STYLE_ID, MAX(START_DATE) AS START_DATE FROM MERCH.IRO_POS_PRICES WHERE SITE_ID = '\''00011'\'' AND BUSINESS_UNIT_ID = 1 AND TRUNC(SYSDATE) BETWEEN START_DATE AND NVL(END_DATE, '\''01-jan-2525'\'') GROUP BY STYLE_ID) currentpricespan LEFT JOIN MERCH.IRO_POS_PRICES ipp ON currentpricespan.STYLE_ID = ipp.STYLE_ID AND currentpricespan.START_DATE = ipp.START_DATE WHERE SUBSTR(ipp.NEW_RETAIL_PRICE, -1) = '\''9'\'' AND SITE_ID = '\''00011'\'' GROUP BY ipp.STYLE_ID, ipp.NEW_RETAIL_PRICE, ipp.START_DATE, ipp.SITE_ID ORDER BY ipp.STYLE_ID) instoresales ON instoresales.STYLE_ID = IRO_POS_STYLES.STYLE_ID GROUP BY IRO_POS_STYLES.STYLE_ID, NEW_RETAIL_PRICE, START_DATE, SITE_ID",
  "poll.interval.ms": 10800000,
  "offset.flush.timeout.ms": 120000
  } }' \
  http://$CONNECT_HOST:$CONNECT_PORT/connectors

# MERCH.IRO_POS_PRICES - current day online sale price connector
curl -X POST   -H "Content-Type: application/json" \
  --data '{ "name": "online-prices-jdbc-source",
  "config": { "connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector",
  "tasks.max": 1,
  "connection.url": "jdbc:oracle:thin:myplanet/M1P12n3t@//142.215.51.103:1521/MTST",
  "mode": "bulk",
  "batch.max.rows": 1000,
  "topic.prefix": "prices-connect-jdbc",
  "validate.non.null": "false",
  "errors.log.enable": true,
  "numeric.mapping": "best_fit",
  "query": "SELECT IRO_POS_STYLES.STYLE_ID, NEW_RETAIL_PRICE, START_DATE, SITE_ID FROM MERCH.IRO_POS_STYLES LEFT JOIN (SELECT ipp.STYLE_ID, ipp.NEW_RETAIL_PRICE, ipp.START_DATE, ipp.SITE_ID FROM (SELECT STYLE_ID, MAX(START_DATE) AS START_DATE FROM MERCH.IRO_POS_PRICES WHERE SITE_ID = '\''00990'\'' AND BUSINESS_UNIT_ID = 1 AND TRUNC(SYSDATE) BETWEEN START_DATE AND NVL(END_DATE, '\''01-jan-2525'\'') GROUP BY STYLE_ID) currentpricespan LEFT JOIN MERCH.IRO_POS_PRICES ipp ON currentpricespan.STYLE_ID = ipp.STYLE_ID AND currentpricespan.START_DATE = ipp.START_DATE WHERE SUBSTR(ipp.NEW_RETAIL_PRICE, -1) = '\''9'\'' AND SITE_ID = '\''00990'\'' GROUP BY ipp.STYLE_ID, ipp.NEW_RETAIL_PRICE, ipp.START_DATE, ipp.SITE_ID ORDER BY ipp.STYLE_ID) instoresales ON instoresales.STYLE_ID = IRO_POS_STYLES.STYLE_ID GROUP BY IRO_POS_STYLES.STYLE_ID, NEW_RETAIL_PRICE, START_DATE, SITE_ID",
  "poll.interval.ms": 10800000,
  "offset.flush.timeout.ms": 120000
  } }' \
  http://$CONNECT_HOST:$CONNECT_PORT/connectors

#86400000, 24 hours

# VSTORE.SKUINVENTORY connector
curl -X POST   -H "Content-Type: application/json" \
  --data '{ "name": "vstore-skuinventory-jdbc-source",
  "config": { "connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector",
  "tasks.max": 1,
  "connection.url": "jdbc:oracle:thin:myplanet/M1P12n3t@//142.215.51.103:1521/MTST",
  "schema.pattern": "VSTORE",
  "table.whitelist": "SKUINVENTORY",
  "table.poll.interval.ms": 3600000,
  "mode": "timestamp",
  "batch.max.rows": 1000,
  "timestamp.column.name": "LASTMODIFIEDDATE",
  "numeric.mapping": "best_fit",
  "topic.prefix": "inventory-connect-jdbc-",
  "validate.non.null": "false",
  "poll.interval.ms": 60000, "offset.flush.timeout.ms": 60000 } }' \
  http://$CONNECT_HOST:$CONNECT_PORT/connectors

# VSTORE.SKU connector
curl -X POST   -H "Content-Type: application/json" \
  --data '{ "name": "vstore-sku-jdbc-source",
  "config": { "connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector",
  "tasks.max": 1,
  "connection.url": "jdbc:oracle:thin:myplanet/M1P12n3t@//142.215.51.103:1521/MTST",
  "schema.pattern": "VSTORE",
  "table.whitelist": "SKU",
  "table.poll.interval.ms": 3600000,
  "mode": "timestamp",
  "incrementing.column.name": "",
  "timestamp.column.name": "LASTMODIFIEDDATE",
  "topic.prefix": "sku-connect-jdbc-",
  "validate.non.null": "false",
  "numeric.mapping": "best_fit",
  "poll.interval.ms": 60000, "offset.flush.timeout.ms": 60000 } }' \
  http://$CONNECT_HOST:$CONNECT_PORT/connectors


VERY IMPORTANT - Delete the NodePort ingress when setup is complete!
