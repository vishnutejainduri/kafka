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
