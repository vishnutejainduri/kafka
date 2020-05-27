# Setting up VPN access to on-prem resources

We are using a Vyatta VRA to set up a persistent VPN connection between IBM Cloud and the on-prem resources. This VRA is already configured for the current clusters. For new clusters contact HR to whitelist them.

1. (Optional, check only for debugging if contacted HR and still not working) Ensure that VLAN spanning to the cluster is enabled. https://console.bluemix.net/docs/infrastructure/vlans/vlan-spanning.html#vlan-spanning
2. (Optional, check only for debugging if contacted HR and still not working) Ensure that the new clusters are configured to use the subnets that are configured for on-prem access in the Vyatta: https://console.bluemix.net/docs/containers/cs_subnets.html#subnets_custom 
3. Deploy a daemon set to enable static routing of on-prem IPs from the cluster to the Vyatta VRA. See "Reverse Path Filtering" in this article: https://www.ibm.com/blogs/bluemix/2017/07/kubernetes-and-bluemix-container-based-workloads-part4/
and example code here: https://github.com/jkwong888/k8s-add-static-routes. Our route map should contain only ```'
                                                                                                                   [
                                                                                                                     "142.215.50.0/23"
                                                                                                                   ]'```

Note: the yaml file in the github repository does not work with Kubernetes v1.16 and above; use 'add-static-route-daemonset-apiVersion-appsv1.yaml' instead.

You can validate that the access is working by creating a busybox, SSHing in, and pinging an
on-prem resource:
1. `kubectl run -i --tty --rm debug --image=busybox --restart=Never -- sh`
2. `ping <IP address of Jesta or DPM>`
