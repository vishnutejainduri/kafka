## Setup
Populate .env with the following variables:

* KUBE_DEV_USERNAME
* KUBE_DEV_PASSWORD
* KUBE_DEV_TENANT
* KUBE_DEV_HOST

* KUBE_PROD_USERNAME
* KUBE_PROD_PASSWORD
* KUBE_PROD_TENANT
* KUBE_PROD_HOST

* HR_PLATORM_PATH

## Find all created connectors and their versions using kafkacat
Run something like the following code:
```
kafkacat -C -X bootstrap.servers=$KAFKA_BROKERS -X security.protocol=SASL_SSL -X sasl.mechanisms=PLAIN -X sasl.password=$KAFKA_PASSWORD -X sasl.username=$KAFKA_USERNAME -t kafka-connect-config -o 0 > development-kafka-connect-config.log
```

Change `staging-platform-connect-config.log` to reflect the relevant environment. `platform-connect-config` is the name of the Kafka Connect special topic. It may differ by environment. For us, the name is `kafka-connect-config` for development and production, and `platform-connect-config` for staging. The name is set as a configuration parameter when we start the Kafka Connect service on Kubernetes.

### Environment config for kafkacat
e.g. Development environment
```bash
KAFKA_BROKERS=broker-1-wjsrff5cz9cpsyg3.kafka.svc02.us-south.eventstreams.cloud.ibm.com:9093,broker-3-wjsrff5cz9cpsyg3.kafka.svc02.us-south.eventstreams.cloud.ibm.com:9093,broker-4-wjsrff5cz9cpsyg3.kafka.svc02.us-south.eventstreams.cloud.ibm.com:9093,broker-0-wjsrff5cz9cpsyg3.kafka.svc02.us-south.eventstreams.cloud.ibm.com:9093,broker-2-wjsrff5cz9cpsyg3.kafka.svc02.us-south.eventstreams.cloud.ibm.com:9093,broker-5-wjsrff5cz9cpsyg3.kafka.svc02.us-south.eventstreams.cloud.ibm.com:9093
KAFKA_USERNAME=token
KAFKA_PASSWORD=mXMZoKv8g5NZRnKZo-1cpFtshXSodLO4YLSrqelCI4B1
```

## Examples
* `./statusConnector.sh dev`
* `./createConnector.sh dev inv`
