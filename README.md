# Working with the Product API on IBM Cloud
The product API is built as a mostly serverless microservice leveraging IBM Cloud.
To deploy many of the components requires you to install the `ibmcloud` and `kubectl` CLI tools.

Please see the [Getting Started with the IBM Cloud CLI](https://console.bluemix.net/docs/cli/index.html#overview) page for more details.

Many of the files you'll see here are YAML files. These files are intended to create
and configure secrets and deployments within our IBM Cloud Kubernetes cluster.

# Configuration
- The cluster we are working with is the `Kafka-Connect-dev`.
- The Event Streams service is `event-streams-platform`.
- The Resource Group is `Harry Rosen Platform`
- The Space is `Harry Rosen Dev Dallas`
- The organization is `Myplanet Harry Rosen`
- our preferred deployment data centre is `Dallas` and `us-south`
- *DO NOT* deploy to Washington. This is an enterprise-only data centre.

All of these options will be automatically configured in the future, but need to be manually configured right now.

# API App Configuration

The API Node/Express app expects the following environment variables:
- `MONGO_URI` - Connection URI for Mongo

# Logging in
There are three logins required.
1. `ibmcloud` - see the Getting Started doc for logging in and setting Org, Space, etc
2. `kubectl` - used for interacting with the cluster. See [Setting up the CLI](https://console.bluemix.net/docs/containers/cs_cli_install.html#cs_cli_configure) for details
3. `ibmcloud cr` - used for uploading images to our container registry. Login with `ibmcloud cr login`

# Deploying the Event Streams functionality to populate the data store

1. Build and upload the Docker image for the Kafka Connect host. See `/kafka-connect-image` for more details
2. Set up VPN connectivity for the host. This assumes the Vyatta VRA VPN is set up already. See `ibmCloudK8sVPN` for more
details.
3. Ensure the proper Kafka topics have been set up. `TODO script for this`
4. Create a K8s deployment for the Connect Host. See `/kafka-connect-deployment` for more details.

# Inventory Refresh Process

There are many times when we need to do a complete wipe and then replace of all inventory data in our mongodb. This is more than just resyncing data, since we need to delete the existing data as well,hence it's a full refresh of our inventory data.
1. Create an `inventory2` mongodb collection. Create the exact same indexes as the `inventory` collection. Some helpful commands; Get Indexes: `db.inventory.getIndexes()`, Create Index: `db.inventory2.createIndex({ _id: 1 })`
2. Redeploy the `platform-production` cloud function namespace via the toolchain, modifiying the `INVENTORY_COLLECTION` environment variable to the newly created `inventory2` collection.
3. After `platform-production` is deployed using `inventory2`, we must rerun all inventory where quantity on hand sellable is greater than 0 (`QOHSELLABLE > 0`). NOTE: As of this step any system using the `hr-product-api` will and should still be using `inventory` so that it has valid inventory to keep functioning but because `platform-production` is now deployed to `inventory2` no inventory updates will appear. 
4. To rerun inventory where quantity on hand sellable is greater than 0, deploy the following connector: `inventory-fast-load-jdbc.json` through the Kafka Connect API. In production this is deployed to the `myplanet-platform-cluster-stage` kubernetes cluster using the `kafka-connect-standard` deployment. Once the `inventory-fast-load-jdbc.json` connector has sent all messages to the `inventory-connect-jdbc-SKUINVENTORY` kafka topic make sure to delete it.
5. Wait until all messages sent by `inventory-fast-load-jdbc.json` are processed and in `inventory2` inside mongodb. At this point in time it is valuable to do a count of how many messages `inventory-fast-load-jdbc.json` sent, it should exactly match with the total document count in `inventory2`
6. Redeploy the `platform-production` cloud function namespace via the toolchain, modifiying the `INVENTORY_COLLECTION` environment variable back to the old `inventory` collection.
7. Preferably right as the toolchain in Step 6 is finishing and the cloud functions are switching from `inventory2` to `inventory`, the two collections should be swapped in mongodb. This is best done by running a rename command, such as the following: `db.inventory.renameCollection('inventory3')` and then `db.inventory2.renameCollection('inventory')`
8. After Step 7 and the toolchain in Step 6 are done, you should now have an `inventory` collection that matches exactly all inventory where quantity on hand sellable is greater than 0, the cloud functions should be updating this collection onwards, and the `hr-product-api` should be serving up to date inventory data from this same collection. 

# Retry/DLQ Mechanism
To improve fault tolerance of the cloud functions for the cases where downstream services, i.e. mongo or algolia or commercetools, are experiencing transient issues e.g. temporary downtime, we store the messages that are passed to the cloud functions and if we fail to process some or all of the messages, we queue the messages were not processed to be processed again.

## Terminology
- Dead Letter Queue (DLQ): if a message has been retried multiple times but it still has failed, it will be sent to DLQ to be examined manually.
- Partial failure: each invocation of a cloud function processes a batch of messages and if some of the messages in a batch fail while the rest succeed, it will cause a partial failure.

## Mongo for Messages Collections
We have a number of Mongo databases that store the information relevant to retry mechanism implemented inside the cloud functions. These are the topics on these instances:
- `dlqMessagesMyActiviationIds`: The dead letter queue, where failed messages are sent after they reach the `MAX_RETRIES`
- `messagesByActiviationIds`: Where all processed messages are initially sent
- `retryMessagesMyActiviationIds`: Where messages are sent after failing, before reaching the `MAX_RETRIES` limit
- `successMessagesByActivationIds`: Where messages that have been successfully processed are sent

There is also `invalidMessagesByActivationIds`, which was created to store messages that fail schema validation. However, after the initial effort,we stopped developing schema validation mechanism further and this topic can be ignored.

## DLQ
The current implementation of the retry mechanism does not consider the cause of failure of the messages and queues all of them to be retried. However, since retry is only useful for transient issues and not for other types of problems that can prevent a message from being processed e.g. invalid data or code bugs, we want to limit the number of times that a message is retried. Once a messages has been retried past a certain threshold, we send the messages to a Dead Letter Queue; the messages in DLQ will not be retried and need to manually examined by developers.

To keep track of how many times a particular value has been retried, we set a `retries` property on the `metadata` field of each value. We retry a value until its `retries` exceeds `MAX_RETRIES`, after which point we send that messages to a DLQ.

Note: each value is contained within the `value` field of each `message`, as `messages` are the units of data coming from Kafka which have additional data such as offset of the message.

Note: A Mongo database instance e.g. myplanet-platform-development-messages is used for keeping track of all of the values which need to be either retried or DLQed. All of the interactions with this instance are encapsulated in `messagesLogs` module.

Note: The messages are stored in a Mongo instance that is in a geographical region different from that of the main Mongo instance, to reduce the chances of both the main instance and the messages instance failing at the same.

## Implementation details
1. A function called storeBatch, which is called for each cloud function that is wrapped by addLoggingToMain, saves the messages of that batch to messagesByActivationeIds collection on mongoForMessages database instance and marks the batch with the following information:

- resolved property set to false
- index of the messages that have failed
- the time that the batch was recorded

Note: Many cloud functions utilize addErrorHandlingpassDownAnyMessageErrors, passDownBatchedErrorsAndFailureIndexes, and passDownProcessedMessages to deal with partial failure of messages within a cloud function.

2. A cloud function called resolveMessagsLogs which is triggered every minute does three things:

- it finds all the unresolved batches on messagesByActivationIds and then

- fetches the activation result by calling ibmcloud REST, and then

- if any of the messages of a batch have not succeeded, it groups and stores the unsucessful messages to be either DLQed or retried, depending on whether each unsucessful message has reached its MAX_RETRIES or not, respectively.

Note: If we cannot obtain the activation result of a batch from IBM Cloud, we consider that batch to have failed; i.e. a batch has either explicitly succeeded or it has failed. Activation result might be missing because IBM does not gaurantee that activation results will be stored for more than 24 hrs after they are recorded, and so to be on the safe side, in case for whatever reason the retry mechanism stops working for more than 24hrs and we fail to retrieve the activations, we retry every unsucessful activation.

Note: We don't attempt to resolve stored batches of message until 10 minutes after their record time, because an invocation can run up to 10 minutes on openwhisk and attempting to get the activation result sooner than that might result in the batch being retried, because as pointed out in the previous note, if activation result is not available we automatically mark the batch for retry.

Note: If a message needs to be retried, we set its nextRetry  property based on RETRY_INTERVAL and the number of times that it has been retried so far to add a back-off between retries.

3. Another cloud function called handleMessages polls retryMessagesByActivationIds  every minute and then check each single message to see if it has reached it's MAX_RETRIES or not; if it has reached it, we store it into dlqMessagesByActivationIds , otherwise we use Kafka producer and requeue that message back into its topic.

### Components
- `resolveMessagesLogs.js`: after a batch of messages is stored, this cloud function decides which of the messages, if any, need to be sent to retry or DLQ collections; further more, it also determines when the next retry for each message should happen and stores it into the `meta` field of the message.
- `handleMessagesLogs.js`: this cloud function transfers messages that are in `retryMessagesMyActiviationIds` into their corresponding topics in Kafka.
- `cleanupMessagesLogs.js`: this cloud functions deletes old messages that are older than the value set by the environmental variable `MESSAGES_LOGS_PERSISTENCE_DAYS` from the collections hard coded in its source.
- `lib/messagesLogs.js`: this module contains multiple utility functions that perform CRUD operations on the Mongo instance that stores the messages.
- `product-consumers/utils.js`: this module contains multiple utility functions that wrap other cloud functions to enable retry/DLQ mechanism for them.
  - `passDownAnyMessageErrors`
  - `passDownBatchedErrorsAndFailureIndexes`
  - `passDownProcessedMessages`
  - `addLoggingToMain`

### Periodic rules
Cloud functions that implement the retry mechanism are invoked periodically by a set of openwhisk rules as specified in `manifest-triggers-iam.yaml`:

- resolve-messages-logs-rule
- handle-messages-logs-rule
- cleanup-messages-logs-rule

### `metadata` field
If a message is marked as failed, the retry mechanism via `resolveMessagesLogs.js` will add a `metadata` field to. This field has three properties:
- `lastRetry`: The last time the message was retried
- `nextRetry`: The next time that the message should be retried
- `retries`: The total times that the message has been retried

`resolveMessagesLogs.js` reads all the messages from `messagesByActiviationIds` collection and determine that if they have failed or not. If they have not, they are put into `successMessagesByActivationIds` collection.

However, if a message has failed, based on whether its `retries` value is less than `MAX_RETRIES` or not,  it will be put it into either `retryMessagesMyActiviationIds` or `dlqMessagesMyActiviationIds`, respectively. If a message should be retried, then based on the current value of `retries` and `INTERVAL_GROWTH_RATE`, its `nextRetry` will also be updated by `resolveMessagesLogs.js`.

`retryMessagesMyActiviationIds` reads messages that should be retried, i.e. those with a `nextRetry` that is before the time that `handleMessagesLogs.js` has run, updates their `lastRetry` to the current time and increase their `retries` counter, and then produce them into their corresponding topics on Kafka.

## Environmental variables
We need a set of environmental variables to access:
- Cloud Functions API, to fetch activation result of cloud functions by their activation ID
- Messages Mongo instance, to store messages in a Mongo instance in case they need to be retried/DLQed later
- Kafka, to produce messages that need to be retried to their corresponding topics

For more information refer to #retry section on `.env.template`
