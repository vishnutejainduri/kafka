Configuring Ingress to Kafka Connect

We must use the Kafka Connect REST API In order to configure Kafka Connect. Since Kafka Connect is running in K8s, we need
to configure Ingress. We use IBM Cloud's Ingress and configure authentication with App ID.

See this tutorial for more detailed information on integrating App ID and IBM Cloud Kubernetes: https://cloud.ibm.com/docs/services/appid?topic=appid-kube-auth

Setup:

1. Set up the App ID instance.
Search for "App ID" in the IBM Cloud dashboard and you will be able to create an instance. Configure the instance to have
tiered usage (not "Lite")

2. Bind the App ID instance to the cluster
You will require the IBM Cloud CLI. See the root README in this repo for more information on setting it up locally. Bind
 the App ID instance with this command:
`ibmcloud ks cluster-service-bind --cluster <cluster_name_or_ID> --namespace <namespace> --service <App-ID_instance_name>`
(namespace = "default")

3. Configure the Ingress
3a. Set the context of kubectl to the cluster hosting Kafka Connect. Run `ibmcloud ks cluster-config --cluster <cluster_id>`
The output will contain an "export KUBECONFIG=..." statement. Copy and run that statement in terminal.

3b. Run `kubectl apply -f configs/ingress.yaml`

