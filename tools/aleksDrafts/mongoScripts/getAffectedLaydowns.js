const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;

const devParams = {
  mongoUri: "mongodb://ibm_cloud_487892a2_1f5f_45ac_99a4_5db91f782e99:3b162029f94f9b93127d74bd12e6e73a5e5c6b630dd97dd9de7ef3053dd16613@ac54f42e-a6f3-46c7-95a1-ff665b9f2d61-0.6131b73286f34215871dfad7254b4f7d.databases.appdomain.cloud:31917,ac54f42e-a6f3-46c7-95a1-ff665b9f2d61-1.6131b73286f34215871dfad7254b4f7d.databases.appdomain.cloud:31917/ibmclouddb?authSource=admin&replicaSet=replset",
  dbName: "ibmclouddb",
  mongoCertificateBase64: "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUREekNDQWZlZ0F3SUJBZ0lKQU5FSDU4eTIva3pITUEwR0NTcUdTSWIzRFFFQkN3VUFNQjR4SERBYUJnTlYKQkFNTUUwbENUU0JEYkc5MVpDQkVZWFJoWW1GelpYTXdIaGNOTVRnd05qSTFNVFF5T1RBd1doY05Namd3TmpJeQpNVFF5T1RBd1dqQWVNUnd3R2dZRFZRUUREQk5KUWswZ1EyeHZkV1FnUkdGMFlXSmhjMlZ6TUlJQklqQU5CZ2txCmhraUc5dzBCQVFFRkFBT0NBUThBTUlJQkNnS0NBUUVBOGxwYVFHemNGZEdxZU1sbXFqZmZNUHBJUWhxcGQ4cUoKUHIzYklrclhKYlRjSko5dUlja1NVY0NqdzRaL3JTZzhublQxM1NDY09sKzF0bys3a2RNaVU4cU9XS2ljZVlaNQp5K3laWWZDa0dhaVpWZmF6UUJtNDV6QnRGV3YrQUIvOGhmQ1RkTkY3Vlk0c3BhQTNvQkUyYVM3T0FOTlNSWlNLCnB3eTI0SVVnVWNJTEpXK21jdlc4MFZ4K0dYUmZEOVl0dDZQUkpnQmhZdVVCcGd6dm5nbUNNR0JuK2wyS05pU2YKd2VvdllEQ0Q2Vm5nbDIrNlc5UUZBRnRXWFdnRjNpRFFENW5sL240bXJpcE1TWDZVRy9uNjY1N3U3VERkZ2t2QQoxZUtJMkZMellLcG9LQmU1cmNuck03bkhnTmMvbkNkRXM1SmVjSGIxZEh2MVFmUG02cHpJeHdJREFRQUJvMUF3ClRqQWRCZ05WSFE0RUZnUVVLMytYWm8xd3lLcytERW9ZWGJIcnV3U3BYamd3SHdZRFZSMGpCQmd3Rm9BVUszK1gKWm8xd3lLcytERW9ZWGJIcnV3U3BYamd3REFZRFZSMFRCQVV3QXdFQi96QU5CZ2txaGtpRzl3MEJBUXNGQUFPQwpBUUVBSmY1ZHZselVwcWFpeDI2cUpFdXFGRzBJUDU3UVFJNVRDUko2WHQvc3VwUkhvNjNlRHZLdzh6Ujd0bFdRCmxWNVAwTjJ4d3VTbDlacUFKdDcvay8zWmVCK25Zd1BveU8zS3ZLdkFUdW5SdmxQQm40RldWWGVhUHNHKzdmaFMKcXNlam1reW9uWXc3N0hSekdPekpINFpnOFVONm1mcGJhV1NzeWFFeHZxa25DcDlTb1RRUDNENjdBeldxYjF6WQpkb3FxZ0dJWjJueENrcDUvRlh4Ri9UTWI1NXZ0ZVRRd2ZnQnk2MGpWVmtiRjdlVk9XQ3YwS2FOSFBGNWhycWJOCmkrM1hqSjcvcGVGM3hNdlRNb3kzNURjVDNFMlplU1Zqb3VaczE1Tzkwa0kzazJkYVMyT0hKQUJXMHZTajRuTHoKK1BRenAvQjljUW1PTzhkQ2UwNDlRM29hVUE9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCgo="
};

const prodParams = {
  mongoUri: "mongodb://ibm_cloud_038bc2c1_2751_44f8_8335_0dcecde9bf6e:b24308e2966295bfcab397fc9beb0105079dd6c362ffbfa925080e987014f362@7c57adec-00f5-426f-bf90-bbdc12f1d0d2-0.6131b73286f34215871dfad7254b4f7d.databases.appdomain.cloud:32307,7c57adec-00f5-426f-bf90-bbdc12f1d0d2-1.6131b73286f34215871dfad7254b4f7d.databases.appdomain.cloud:32307/ibmclouddb?authSource=admin&replicaSet=replset",
  dbName: "ibmclouddb",
  mongoCertificateBase64: "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUREekNDQWZlZ0F3SUJBZ0lKQU5FSDU4eTIva3pITUEwR0NTcUdTSWIzRFFFQkN3VUFNQjR4SERBYUJnTlYKQkFNTUUwbENUU0JEYkc5MVpDQkVZWFJoWW1GelpYTXdIaGNOTVRnd05qSTFNVFF5T1RBd1doY05Namd3TmpJeQpNVFF5T1RBd1dqQWVNUnd3R2dZRFZRUUREQk5KUWswZ1EyeHZkV1FnUkdGMFlXSmhjMlZ6TUlJQklqQU5CZ2txCmhraUc5dzBCQVFFRkFBT0NBUThBTUlJQkNnS0NBUUVBOGxwYVFHemNGZEdxZU1sbXFqZmZNUHBJUWhxcGQ4cUoKUHIzYklrclhKYlRjSko5dUlja1NVY0NqdzRaL3JTZzhublQxM1NDY09sKzF0bys3a2RNaVU4cU9XS2ljZVlaNQp5K3laWWZDa0dhaVpWZmF6UUJtNDV6QnRGV3YrQUIvOGhmQ1RkTkY3Vlk0c3BhQTNvQkUyYVM3T0FOTlNSWlNLCnB3eTI0SVVnVWNJTEpXK21jdlc4MFZ4K0dYUmZEOVl0dDZQUkpnQmhZdVVCcGd6dm5nbUNNR0JuK2wyS05pU2YKd2VvdllEQ0Q2Vm5nbDIrNlc5UUZBRnRXWFdnRjNpRFFENW5sL240bXJpcE1TWDZVRy9uNjY1N3U3VERkZ2t2QQoxZUtJMkZMellLcG9LQmU1cmNuck03bkhnTmMvbkNkRXM1SmVjSGIxZEh2MVFmUG02cHpJeHdJREFRQUJvMUF3ClRqQWRCZ05WSFE0RUZnUVVLMytYWm8xd3lLcytERW9ZWGJIcnV3U3BYamd3SHdZRFZSMGpCQmd3Rm9BVUszK1gKWm8xd3lLcytERW9ZWGJIcnV3U3BYamd3REFZRFZSMFRCQVV3QXdFQi96QU5CZ2txaGtpRzl3MEJBUXNGQUFPQwpBUUVBSmY1ZHZselVwcWFpeDI2cUpFdXFGRzBJUDU3UVFJNVRDUko2WHQvc3VwUkhvNjNlRHZLdzh6Ujd0bFdRCmxWNVAwTjJ4d3VTbDlacUFKdDcvay8zWmVCK25Zd1BveU8zS3ZLdkFUdW5SdmxQQm40RldWWGVhUHNHKzdmaFMKcXNlam1reW9uWXc3N0hSekdPekpINFpnOFVONm1mcGJhV1NzeWFFeHZxa25DcDlTb1RRUDNENjdBeldxYjF6WQpkb3FxZ0dJWjJueENrcDUvRlh4Ri9UTWI1NXZ0ZVRRd2ZnQnk2MGpWVmtiRjdlVk9XQ3YwS2FOSFBGNWhycWJOCmkrM1hqSjcvcGVGM3hNdlRNb3kzNURjVDNFMlplU1Zqb3VaczE1Tzkwa0kzazJkYVMyT0hKQUJXMHZTajRuTHoKK1BRenAvQjljUW1PTzhkQ2UwNDlRM29hVUE9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCgo=" 
};

//const wstreamError = fs.createWriteStream('errors.csv');
//const wstreamSuccess = fs.createWriteStream('success.csv');
const wstreamOutput = fs.createWriteStream('report.json');

const params = prodParams;

const ca = [Buffer.from(params.mongoCertificateBase64, 'base64')];
const options = {
  ssl: true,
  sslValidate: true,
  sslCA: ca,
  useNewUrlParser: true
};

MongoClient.connect(params.mongoUri, options, (err, client) => {
  const collection = client.db(params.dbName).collection('laydowns');

  fs.readFile('./files/prod/8digit_to_10digit_styles_delete_PROD.csv', 'utf-8', (err, data) => {
    if (err) throw err;
    let dataRows = data.split('\n');
    console.log('starting record count', dataRows.length);
    collection.find({ "products": { $in: dataRows } }).toArray((err, affectedLaydowns) => {
      if (err) throw err;
      console.log('affected laydowns count', affectedLaydowns.length);
      //console.log(affectedLaydowns);
      
      //const stylesAffected = affectedLaydowns.map((laydown) => laydown.products.filter((product) => dataRows.indexOf(product) > -1));
      //const stylesAffectedAmount = affectedLaydowns.map((laydown) => laydown.products.filter((product) => dataRows.indexOf(product) > -1).length).reduce((total, amount) => total + amount);
      //console.log('affected styles', stylesAffected);

      wstreamOutput.write(JSON.stringify(affectedLaydowns.map((laydown) => {
        return {
          "id": laydown._id,
          "products": laydown.products.filter((product) => dataRows.indexOf(product) > -1)
        };
      })));
    });
  });
});
