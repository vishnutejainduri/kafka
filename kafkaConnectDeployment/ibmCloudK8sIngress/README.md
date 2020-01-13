*Note* You can consistently enforce policy-driven security by using the Ingress networking capability in IBM Cloud™ Kubernetes Service or OpenShift. With this approach, you can enable authorization and authentication for all of the applications in your cluster at the same time, without ever changing your app code!
Further details:
- https://cloud.ibm.com/docs/services/appid?topic=appid-kube-auth

Configuring Ingress to Kafka Connect

We must use the Kafka Connect REST API In order to configure Kafka Connect. Since Kafka Connect is running in K8s, we need
to configure Ingress. We use IBM Cloud's Ingress and configure authentication with App ID.


# Setup

1. Set up the App ID instance and a service credential.
1a. Search for "App ID" in the IBM Cloud dashboard and you will be able to create an instance. Configure the instance to have
tiered usage (not "Lite"). Ensure that the service name does not contain any spaces.
Further details:
- https://cloud.ibm.com/docs/services/appid?topic=appid-kube-auth&locale=dk#kube-create-appid (Disregard "The App ID instance should be in the same region in which your cluster is deployed." if the cluster's region is not listed.)

(optional) 1b. You can create a new service credentials with role 'Writer'; alternatively, a key will be automatically created while binding App ID instance to the cluster in the next step.


2. Bind the App ID instance to the cluster
*Note* Service Catalog is an extension API that enables applications running in Kubernetes clusters to easily use external managed software offerings (e.g. App ID):
Further details:
- https://kubernetes.io/docs/concepts/extend-kubernetes/service-catalog/#usage
- https://cloud.ibm.com/docs/containers-cli-plugin?topic=containers-cli-plugin-kubernetes-service-cli#cs_cluster_service_bind

You will require the IBM Cloud CLI. See the root README in this repo for more information on setting it up locally. Bind
 the App ID instance with the following command. You can specify an existing service key by using the -key flag, or omit `[--key <service_instance_key>]` and a set of credentials will be automatically created:
`ibmcloud ks cluster-service-bind --cluster <cluster_name_or_ID> --namespace <namespace> --service <App-ID_instance_name> [--key <service_instance_key>]`
(namespace = "default")
WARNING: This legacy command is deprecated and will soon be unsupported. Use the 'ibmcloud ks cluster service bind' command instead if not working.

3. Configure the Ingress
*Note* You can consistently enforce policy-driven security by using the Ingress networking capability in IBM Cloud™ Kubernetes Service.
Further details:
- https://cloud.ibm.com/docs/services/appid?topic=appid-kube-auth&locale=dk#configuring-ingress

3a. Set the context of kubectl to the cluster hosting Kafka Connect. Run `ibmcloud ks cluster-config --cluster <cluster_id>`
The output will contain an "export KUBECONFIG=..." statement. Copy and run that statement in terminal.

3b. For Dev: 
    Run `kubectl apply -f configs/ingress-dev.yaml`
    For Prod:
    Run `kubectl apply -f configs/ingress-prod.yaml`

*Parameters*
- host: 'Ingress subdomain' from the 'Overview' tab of the cluster
- secretName: 'Ingress secret' from running `bmcloud ks cluster get --cluster <cluster_name_or_id>`
Further details:
- https://cloud.ibm.com/docs/containers?topic=containers-ingress#public_inside_2

# Accessing Kafka Connect over the ingress

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

Send a POST request to https://<region>.appid.cloud.ibm.com/oauth/v4/<tenant-id>/token
- use basic auth, with the user = `clientId` from the secret, and password = `secret` from the secret
- send form data key "grant_type" and value "client_credentials"
- The <region> should correspond to the region the App ID instance was created in, and the <tenant-id> should correspond
  to the tenant ID in the secret from step 1.

Further details:
- https://cloud.ibm.com/apidocs/app-id/auth#token
- https://cloud.ibm.com/docs/services/appid?topic=appid-obtain-tokens

3. Use the bearer token to authenticate requests
The response will contain an "access_token" field. Use that value as the token in an "Authorization: Bearer <token>"
header for all requests.

Usage:
- 'tools/kafka/lib/getSessionToken.js'