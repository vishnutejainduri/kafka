Configuring Logging

Logging is provided using IBM Cloud's LogDNA service.

0. Ensure that your `kubectl` command is targeting the right cluster
See "Connect via CLI" on the IBM Cloud dashboard for the cluster.

1. Get the LogDNA agent key
Go to the IBM Cloud Dashboard -> Observability -> Logging then click on "Edit log sources". Click on "Kubernetes". The
first command will look like
`kubectl create secret generic logdna-agent-key --from-literal=logdna-agent-key=<somestring>`

Run this command.

2. Create the daemonset for the cluster
Run `kubectl create -f configs/logdna-agent-ds.<env>.yaml`, replacing <env> with "dev" or "prod".

3. Create LogDNA views for Kafka Connect
Go to the LogDNA dashboard and click on views. The following queries may be useful to set up as views:
- Prod Kafka: app:kafka-connect-host tag:production
- Dev Kafka: app:kafka-connect-host tag:dev
