This directory contains functions and config for OpenWhisk on the IBM Cloud.

# Deploying
There is a Continuous Delivery toolchain that uses `deploy.sh` and `manifest.yaml`
to deploy all Cloud Functions.

## Initial Deployment
### Kafka Feed
1. Set the Cloud Functions namespace:
- Parameters:
    - $: export CLOUD_FUNCTIONS_NAMESPACE=<String Cloud Functions namespace>
    e.g. export CLOUD_FUNCTIONS_NAMESPACE="platform-staging"
- Command:
    - $: ibmcloud fn property set --namespace $CLOUD_FUNCTIONS_NAMESPACE

2. An '/whisk.system/messaging' package bound the credentials of the Event Streams instance that will be used as the messages feed should be created:
- Parameters:
    - $: export MESSAGING_FEED_BINDING=<String name of /whisk.system/messaging binding>
    e.g. export MESSAGING_FEED_BINDING="eventStreamsStaging"
    - $: export KAFKA_BROKERS_SASL=<String[] array of broker addresses>
    e.g. export KAFKA_BROKERS_SASL=["broker-3-td05h9dhfzqh2zyq.kafka.svc03.us-south.eventstreams.cloud.ibm.com:9093","broker-5-td05h9dhfzqh2zyq.kafka.svc03.us-south.eventstreams.cloud.ibm.com:9093","broker-4-td05h9dhfzqh2zyq.kafka.svc03.us-south.eventstreams.cloud.ibm.com:9093","broker-0-td05h9dhfzqh2zyq.kafka.svc03.us-south.eventstreams.cloud.ibm.com:9093","broker-2-td05h9dhfzqh2zyq.kafka.svc03.us-south.eventstreams.cloud.ibm.com:9093","broker-1-td05h9dhfzqh2zyq.kafka.svc03.us-south.eventstreams.cloud.ibm.com:9093"]
    - $: export KAFKA_USERNAME=<String: Event Streams username>
    e.g. export KAFKA_USERNAME="token"
    - $: export KAFKA_PASSWORD=<String: Event Streams password>
    - $: export KAFKA_ADMIN_URL=<String: Event Streams admin URL>
    e.g. export KAFKA_ADMIN_URL=https://2tfntg0sj88sy590.svc02.us-south.eventstreams.cloud.ibm.com
- Command:
    - $: ibmcloud fn package bind "/whisk.system/messaging" $MESSAGING_FEED_BINDING -p kafka_brokers_sasl $KAFKA_BROKERS_SASL  -p user $KAFKA_USERNAME -p password $KAFKA_PASSWORD -p kafka_admin_url $KAFKA_ADMIN_URL

- References:
    - https://github.com/apache/openwhisk-package-kafka#setting-up-a-message-hub-package-outside-bluemix
    - https://cloud.ibm.com/docs/openwhisk?topic=cloud-functions-pkg_event_streams#eventstreams_trigger_outside

3. Bind messagehub service credentials to the created package:
- Parameters:
    - $: export SERVICE=messagehub
    - $: export ACTION_NAME=$MESSAGING_FEED_BINDING
    - $: export INSTANCE_NAME=<String name of messagehub service instance>
    e.g. export INSTANCE_NAME=KafkaConnectStagingEventStreams
    - $: export CREDENTIALS_NAME=<String name of the credentials associated with the service instance>
    e.g. export CREDENTIALS_NAME=cloud-functions
- Command:
    - $: ibmcloud fn service bind $SERVICE $ACTION_NAME --instance $INSTANCE_NAME --keyname $CREDENTIALS_NAME
    e.g. ibmcloud fn service bind messagehub "eventStreamsStaging" --instance KafkaConnectStagingEventStreams --keyname cloud-functions
- Notes:
    - 'messagehub' is the service name of event streams e.g. run 'ibmcloud resource service-instance KafkaConnectStagingEventStreams'

- References:
    - https://cloud.ibm.com/unifiedsupport/cases?number=CS1558634
    - https://cloud.ibm.com/docs/openwhisk?topic=cloud-functions-services#services_bind

4. (optional test) Create a trigger with a messageHubFeed, associate it with an action, and monitor if the action is beig invoked for new messages in Kafka instance.
- Parameters:
    - $: export TOPIC_NAME=<String name of the topic to consume messages from>
    e.g. export TOPIC_NAME="inventory-connect-jdbc-SKUINVENTORY"
- Command:
    $: ibmcloud fn trigger create kafka-trigger -f $MESSAGING_FEED_BINDING/messageHubFeed -p topic $TOPIC_NAME -p "isJSONData" true
    e.g. ibmcloud fn trigger create kafka-trigger -f "eventStreamsStaging/messageHubFeed" -p topic "inventory-connect-jdbc-SKUINVENTORY" -p "isJSONData" true

# Config
All config should be specified in the toolchain's Environment Properties and referenced
in the `manifest.yaml`.


NOTE The binding will respond only to new messages; in order to test, either manually send new messages to Kafka or create the Kafka Connectors after the binding is already done.
 