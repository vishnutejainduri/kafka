mongoexport -d=ibmclouddb -c=dlqMessagesByActivationIds -q='{ "metadata.activationInfo.name": "consume-sale-price-ct" }' --limit=10 --out=dlq_prices.json -u="ibm_cloud_91b09168_98d1_4ed3_b31a_bd8e1deada74" -p="45fb70fa014bb8602fa8191a6813e5b39e36da38d3ae513d4ddf67450ec93bf3" --ssl --sslCAFile=5cb6eb86-ae1c-11e9-99c9-6a007ab2fc0b --authenticationDatabase=admin  --host replset/f973be9f-6cbd-4aa2-8281-e0f187a58f01-0.2adb0220806343e3ae11df79c89b377f.databases.appdomain.cloud:30080,f973be9f-6cbd-4aa2-8281-e0f187a58f01-1.2adb0220806343e3ae11df79c89b377f.databases.appdomain.cloud:30080 
