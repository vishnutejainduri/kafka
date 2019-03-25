# Setting up VPN access to on-prem resources

We are using a Vyatta VRA to set up a persistent VPN connection between IBM Cloud and the on-prem resources. This VRA
is already configured. We just need to set up new clusters to use it.

1. Ensure that VLAN spanning to the cluster is enabled. https://console.bluemix.net/docs/infrastructure/vlans/vlan-spanning.html#vlan-spanning
2. Ensure that the new clusters are configured to use the subnets that are configured for on-prem access in the Vyatta: https://console.bluemix.net/docs/containers/cs_subnets.html#subnets_custom 
3. Deploy a daemon set to enable static routing of on-prem IPs from the cluster to the Vyatta VRA. See "Reverse Path Filtering" in this article: https://www.ibm.com/blogs/bluemix/2017/07/kubernetes-and-bluemix-container-based-workloads-part4/
and example code here: https://github.com/jkwong888/k8s-add-static-routes. Our route map should contain only ```'
                                                                                                                   [
                                                                                                                     "142.215.50.0/23"
                                                                                                                   ]'```
