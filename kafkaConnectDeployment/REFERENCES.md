# Overview
Our Kafka Connect instance consists of a kafka-connect deployment, a kafka-connect service, a kafka-connect Ingress, and optionally, if VPN is needed, a static-routes daemonset, and if logging is needed, a logDNA daemonset.

- Deployment: the Kafka Connect process running inside a docker container inside a pod.
- Service: an abstract way to expose our Kafka Connect instance to traffic out of the cluster.
- Ingress: is API object that manages external access to the Kafka Connect service in the cluster.

# Kafka Connect
## Distributed Mode
### Guides
- https://rmoff.net/2019/11/22/common-mistakes-made-when-configuring-multiple-kafka-connect-workers/
- https://stackoverflow.com/questions/51335621/kafka-connect-cluster-setup-or-launching-connect-workers
- https://www.confluent.io/resources/apache-kafka-confluent-enterprise-reference-architecture/ (USE SAFARI)

# Networking
## Guides
- Choosing an exposure service: https://cloud.ibm.com/docs/containers?topic=containers-cs_network_planning
- NodePort: https://strimzi.io/2019/04/23/accessing-kafka-part-2.html
- NodePort: https://cloud.ibm.com/docs/containers?topic=containers-nodeport
- Calico: https://www.ibm.com/cloud/garage/content/course/ibm-cloud-private-networking/6
## References
- NodePort: https://kubernetes.io/docs/concepts/services-networking/service/#nodeport
- Ingress: https://kubernetes.io/docs/concepts/services-networking/ingress/
- User authentication annotations: https://cloud.ibm.com/docs/containers?topic=containers-ingress_annotation#appid-auth

# API
## References
- Kafka Connect REST Interface: https://docs.confluent.io/current/connect/references/restapi.html#connectors

# Security
## Guides
- Key concepts: https://cloud.ibm.com/docs/appid?topic=appid-key-concepts
- Application protection patterns with IBM App ID: https://www.ibm.com/cloud/blog/using-ibm-cloud-app-id-to-protect-applications-built-with-cloud-pak-for-applications
