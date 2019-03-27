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
