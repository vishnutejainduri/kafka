. .env
output=$(curl -s --user $KUBE_USERNAME:$KUBE_PASSWORD -F "grant_type=client_credentials" -X POST https://us-south.appid.cloud.ibm.com/oauth/v4/$KUBE_TENANT/token) 
SESSION_TOKEN=$(echo $output | cut -d',' -f 1 | cut -d':' -f 2 | cut -d'"' -f 2)
