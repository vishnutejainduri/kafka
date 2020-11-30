import * as https from 'https';

export default function (kubeEnv) {
  const { tenant, username, password } = kubeEnv;
  const options = {
    hostname: 'us-south.appid.cloud.ibm.com',
    port: 443,
    path: `/oauth/v4/${tenant}/token`,
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  return new Promise(function (resolve, reject) {
    const request = https.request(options, function (res) {
      let body = '';
      res.on('data', function (data) {
        body += data;
      });
      res.on('end', function () {
        //here we have the full response, html or json object
        resolve(JSON.parse(body));
      });
      res.on('error', function (e) {
        reject(e);
      });
    });

    request.write('grant_type=client_credentials');
    request.end();
  });
}
