## Setup
Populate .env with the following variables:

* KAFKA_BROKERS_DEV
* KAFKA_USER_DEV
* KAFKA_PASSWORD_DEV

* KAFKA_BROKERS_PROD
* KAFKA_USER_PROD
* KAFKA_PASSWORD_PROD

## Examples
* `./getEventStreamTopicLogs_INV.sh dev`

## Steps to recreate a Kafka topic

For each step, the action should be performed for the relevant environment (`development`, `staging`, or `production`).

1. Disable the `hr-eventstreams-cloudfunctions-binding` service
2. Delete the connectors
   - Example: To delete the `elcat-catalog-audit-jdbc-source-v103` and `elcat-catalog-jdbc-source-v110` connectors in `staging`, run
    ```
    npm run deleteSome:staging elcat-catalog-audit-jdbc-source-v103,elcat-catalog-jdbc-source-v110
    ```
3. Delete the Kafka topic
4. Recreate the Kafka topic
5. Start the connectors
   - Example: To start the `elcat-catalog-audit-jdbc-source-v103` and `elcat-catalog-jdbc-source-v110` connectors in `staging`, run
    ```
    npm run recreateDeleted:staging elcat-catalog-audit-jdbc-source-v103,elcat-catalog-jdbc-source-v110
    ```
6. Restart the `hr-eventstreams-cloudfunctions-binding` service
