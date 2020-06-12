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

## Connectors

NOTE: It is VERY important that whenever you delete a timestamp based connector, you note down the exact version somewhere safe for reference.

Note: Connectors that poll the upstream Jesta databases have two operating modes depending on the connector: bulk and timestamp based. Bulk connectors poll the whole database based on set internval e.g. every 48 hours while timestamp based connectors check a monotously increasing id/timestamp column on the table they are polling to only fetch newly added messages.

Note: If you delete a timestamp based connector for a topic and then recreate it with exactly the same name again, it will resume polling the messages from the upstream database from the last timestamp that it had read before being deleted (these timestamps are stored in a special topic called 'offset.storage.topic' that is created by Kafka Connent on the instance that it is writing the messages too when we create the service for the first time).

Note: If you want the created timestamp based connector to restart polling the messages from the upstream database, you should create it with a new name. The convetion we follow for this project is to increase it by one.

Note: If a connector has a version, it is prefixed by 'v' e.g. we will have 'elcat-catalog-audit-jdbc-source' and then 'elcat-catalog-audit-jdbc-source-v1'.

Note: Before we had an incident that after restarting Kafka Connect instance on Kubernetes, some of the connectors where not created automatically and we couldn't find out the latest version that we had used. We had to delete all of the three topics on kubernetes that store Kafka Connect info in order to have a clean restart.
