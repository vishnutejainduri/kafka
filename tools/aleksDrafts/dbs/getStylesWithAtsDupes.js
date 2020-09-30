const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;

const prodParams = {
  mongoUri: "mongodb://ibm_cloud_6e7fa86b_771a_4ba4_bccc_c4ae3bf97e33:d248cc6b6048060a6f7342eb1b277ab59a1156dd025bda43be60ad0d5742f95d@cfea04e2-e02e-4bc7-b8ea-d9b7bcc45912-0.bn2a2uid0up8mv7mv2ig.databases.appdomain.cloud:30874,cfea04e2-e02e-4bc7-b8ea-d9b7bcc45912-1.bn2a2uid0up8mv7mv2ig.databases.appdomain.cloud:30874/ibmclouddb?authSource=admin&replicaSet=replset",
  dbName: "ibmclouddb",
  mongoCertificateBase64: "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUREekNDQWZlZ0F3SUJBZ0lKQU5FSDU4eTIva3pITUEwR0NTcUdTSWIzRFFFQkN3VUFNQjR4SERBYUJnTlYKQkFNTUUwbENUU0JEYkc5MVpDQkVZWFJoWW1GelpYTXdIaGNOTVRnd05qSTFNVFF5T1RBd1doY05Namd3TmpJeQpNVFF5T1RBd1dqQWVNUnd3R2dZRFZRUUREQk5KUWswZ1EyeHZkV1FnUkdGMFlXSmhjMlZ6TUlJQklqQU5CZ2txCmhraUc5dzBCQVFFRkFBT0NBUThBTUlJQkNnS0NBUUVBOGxwYVFHemNGZEdxZU1sbXFqZmZNUHBJUWhxcGQ4cUoKUHIzYklrclhKYlRjSko5dUlja1NVY0NqdzRaL3JTZzhublQxM1NDY09sKzF0bys3a2RNaVU4cU9XS2ljZVlaNQp5K3laWWZDa0dhaVpWZmF6UUJtNDV6QnRGV3YrQUIvOGhmQ1RkTkY3Vlk0c3BhQTNvQkUyYVM3T0FOTlNSWlNLCnB3eTI0SVVnVWNJTEpXK21jdlc4MFZ4K0dYUmZEOVl0dDZQUkpnQmhZdVVCcGd6dm5nbUNNR0JuK2wyS05pU2YKd2VvdllEQ0Q2Vm5nbDIrNlc5UUZBRnRXWFdnRjNpRFFENW5sL240bXJpcE1TWDZVRy9uNjY1N3U3VERkZ2t2QQoxZUtJMkZMellLcG9LQmU1cmNuck03bkhnTmMvbkNkRXM1SmVjSGIxZEh2MVFmUG02cHpJeHdJREFRQUJvMUF3ClRqQWRCZ05WSFE0RUZnUVVLMytYWm8xd3lLcytERW9ZWGJIcnV3U3BYamd3SHdZRFZSMGpCQmd3Rm9BVUszK1gKWm8xd3lLcytERW9ZWGJIcnV3U3BYamd3REFZRFZSMFRCQVV3QXdFQi96QU5CZ2txaGtpRzl3MEJBUXNGQUFPQwpBUUVBSmY1ZHZselVwcWFpeDI2cUpFdXFGRzBJUDU3UVFJNVRDUko2WHQvc3VwUkhvNjNlRHZLdzh6Ujd0bFdRCmxWNVAwTjJ4d3VTbDlacUFKdDcvay8zWmVCK25Zd1BveU8zS3ZLdkFUdW5SdmxQQm40RldWWGVhUHNHKzdmaFMKcXNlam1reW9uWXc3N0hSekdPekpINFpnOFVONm1mcGJhV1NzeWFFeHZxa25DcDlTb1RRUDNENjdBeldxYjF6WQpkb3FxZ0dJWjJueENrcDUvRlh4Ri9UTWI1NXZ0ZVRRd2ZnQnk2MGpWVmtiRjdlVk9XQ3YwS2FOSFBGNWhycWJOCmkrM1hqSjcvcGVGM3hNdlRNb3kzNURjVDNFMlplU1Zqb3VaczE1Tzkwa0kzazJkYVMyT0hKQUJXMHZTajRuTHoKK1BRenAvQjljUW1PTzhkQ2UwNDlRM29hVUE9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCgo=" 
};

const wstreamOutput = fs.createWriteStream('report_styles_dupe_ats.json');

const params = prodParams;

const ca = [Buffer.from(params.mongoCertificateBase64, 'base64')];
const options = {
  ssl: true,
  sslValidate: true,
  sslCA: ca,
  useNewUrlParser: true
};

MongoClient.connect(params.mongoUri, options, (err, client) => {
  const skus = client.db(params.dbName).collection('skus');

  skus.aggregate(
[   {"$project": {"ats":1, "styleId":1}},   {"$unwind":"$ats"},   {"$group": {"_id":{"atsid":"$ats", "styleId":"$styleId"}, "count":{"$sum":1}}},   {"$match": {    "count":{"$gt":1}}},   {"$group": {"_id": "$_id.styleId", "ats":{"$addToSet":"$_id.atsid"}}} ]
).toArray((err, resultStyles) => {
    resultStyles.forEach((style) => {
      console.log(style._id);
      wstreamOutput.write(`{ "_id":"${style._id}" }` + '\n')
    })
  });
});
