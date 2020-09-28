const https = require('https');

const getSessionToken = require('../lib/getSessionToken');
const { formatPathStart, retry } = require('../utils');

async function callGetConnectorNames(kubeHost, token, pathStart) {
    const options = {
        hostname: kubeHost.replace('https://', ''),
        port: 443,
        path: `${formatPathStart(pathStart)}/connectors`,
        method: 'GET',
        headers: {
            Authorization: `${token.token_type} ${token.access_token}`
        }
    };

    return new Promise(function(resolve, reject) {
        const request = https.request(options, function(res){
            let body = "";
            res.on('data', function(data) {
               body += data;
            });
            res.on('end', function() {
                resolve({
                  body,
                  statusCode: res.statusCode
                });
            });
            res.on('error', function(error) {
                reject(error);
            });
        });

        request.end();
    });
}

async function getConnectorNames(kubeParams) {
    const token = await retry(getSessionToken)(kubeParams);
    const { body, statusCode } = await retry(callGetConnectorNames)(kubeParams.host, token, kubeParams.pathStart);
    //here we have the full response, html or json object
    let connectorNames = null;
    let parsingError = false;
    let error = null;

    if (statusCode < 200 || statusCode >= 300) {
      error = new Error(`Server call not successful with status code: ${statusCode}`);
      error.debugInfo = { body };
    } else if (parsingError) {
      error = parsingError;
      error.debugInfo = { body };
    }

    try {
      connectorNames = JSON.parse(body);
    } catch (error) {
      parsingError = true;
    }

    if (error) {
      throw error;
    }

    return connectorNames;
}

module.exports = getConnectorNames;
