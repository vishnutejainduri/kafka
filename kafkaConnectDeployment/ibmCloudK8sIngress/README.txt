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

3b. For Dev: 
    Run `kubectl apply -f configs/ingress-dev.yaml`
    For Prod:
    Run `kubectl apply -f configs/ingress-prod.yaml`


Accessing Kafka Connect over the ingress

1. Get the secret with the credentials
1a. Ensure that your kubectl is set up to target our cluster (see step 3 above).

1b. Run `kubectl get secret <secret-name> -o yaml` where <secret-name> corresponds to the binding secret created in step
2 above. If you aren't sure which secret that is, run `kubectl get secrets --all-namespaces | grep binding` and it will
be the secret that contains the name of the App ID instance.

1c. The output will contain a line starting with "binding: <data>". The data is the base64 encoded credentials. Run
`echo <data> | base64 -d` to get the human-readable secret contents.

2. Use the credentials to obtain an access token
App ID is an oauth2 service. You need to request a Bearer token from the service, then use that for auth purposes. By
default the tokens expire every hour, but this can be configured in the App ID instance. See this documentation for
further details: https://cloud.ibm.com/apidocs/app-id/auth#token

Send a POST request to https://<region>.appid.cloud.ibm.com/oauth/v4/<tenant-id>/token
- use basic auth, with the user = `clientId` from the secret, and password = `secret` from the secret
- send form data key "grant_type" and value "client_credentials"
- The <region> should correspond to the region the App ID instance was created in, and the <tenant-id> should correspond
  to the tenant ID in the secret from step 1.

3. Use the bearer token to authenticate requests
The response will contain an "access_token" field. Use that value as the token in an "Authorization: Bearer <token>"
header for all requests.

