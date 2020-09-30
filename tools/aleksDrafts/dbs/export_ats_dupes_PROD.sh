mongoexport -d=ibmclouddb -c=skus -q='{ [   {"$project": {"ats":1, "styleId":1}},   {"$unwind":"$ats"},   {"$group": {"_id":{"atsid":"$ats", "styleId":"$styleId"}, "count":{"$sum":1}}},   {"$match": {"count":{"$gt":1}}},   {"$group": {"_id": "$_id.styleId", "ats":{"$addToSet":"$_id.atsid"}}} ] }' --out=dupe_ats_PROD.json -u="ibm_cloud_6e7fa86b_771a_4ba4_bccc_c4ae3bf97e33" -p="d248cc6b6048060a6f7342eb1b277ab59a1156dd025bda43be60ad0d5742f95d" --ssl --sslCAFile=fa1498a3-0bba-11ea-9a2f-deb1275e52d0 --authenticationDatabase=admin  --host replset/cfea04e2-e02e-4bc7-b8ea-d9b7bcc45912-0.bn2a2uid0up8mv7mv2ig.databases.appdomain.cloud:30874,cfea04e2-e02e-4bc7-b8ea-d9b7bcc45912-1.bn2a2uid0up8mv7mv2ig.databases.appdomain.cloud:30874 
