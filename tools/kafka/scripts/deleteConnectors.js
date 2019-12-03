const https = require('https');

const getKubeEnv = require('../lib/getKubeEnv');
const getSessionToken = require('../lib/getSessionToken');
const { retry, addErrorHandling } = require('../utils');

function getCallDeleteConnector(kubeHost, token) {
    return function(connectorName) {
        const options = {
            hostname: kubeHost.replace('https://', ''),
            port: 443,
            path: `/connectors/${connectorName}`,
            method: 'DELETE',
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
                    //here we have the full response, html or json object
                    resolve(body);
                });
                res.on('error', function(e) {
                    console.log("Error: an error occured while calling the end point for deleting connector: ", connectorName);
                    reject(e);
                });
            });

            request.end();
        });
    }
}

async function getDeleteConnector(kubeHost, token) {
  const callDeleteConnector = getCallDeleteConnector(kubeHost, token);
  return async function(connectorName) {
    console.log('Deleting connector: ', connectorName);
    const { statusCode, body } = await callDeleteConnector(connectorName);
    if (statusCode < 200 || statusCode >= 300) {
      const errorMessage = `Error: server responded with status code ${statusCode} and could not delete connector: ${connectorName}.`;
      console.log(errorMessage);
      throw new Error(errorMessage);
    }
    console.log(`Success: connector deleted: ${connectorName}`);
    return body;
  }
}

async function deleteConnectors(platformEnv, connectorNames) {
    const kubeParams = getKubeEnv(platformEnv);
    const token = await getSessionToken(kubeParams);
    const deleteConnector = getDeleteConnector(kubeParams.host, token)
    return Promise.all(connectorNames.map(addErrorHandling(retry(deleteConnector))))
}

module.exports = deleteConnectors;
