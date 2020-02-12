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
                res.on('data', function() {});
                res.on('end', function() {
                    //here we have the full response, html or json object
                    resolve({
                        statusCode: res.statusCode
                    });
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

function getDeleteConnector(kubeHost, token) {
  const callDeleteConnector = getCallDeleteConnector(kubeHost, token);
  return async function(connectorName) {
    console.log('Deleting connector: ', connectorName);
    const { statusCode } = await callDeleteConnector(connectorName);
    if (statusCode >= 500) {
      const errorMessage = `Error  - Status Code ${statusCode}. Could not delete connector: ${connectorName}.`;
      console.log(errorMessage);
      throw new Error(errorMessage);
    }
    if (statusCode < 200 || statusCode >= 300) {
        console.log(`Failure  - Status Code ${statusCode}. Could not delete connector: ${connectorName}.`);
        return false;
    }
    console.log(`Success - Status Code ${statusCode}. Connector deleted: ${connectorName}.`);
    return true;
  }
}

async function deleteConnectors(platformEnv, connectorNames) {
    const kubeParams = getKubeEnv(platformEnv);
    const token = await getSessionToken(kubeParams);
    const deleteConnector = addErrorHandling(retry(getDeleteConnector(kubeParams.host, token)));
    const results = [];
    for (let i = 0; i < connectorNames.length; i++) {
        const result = await deleteConnector(connectorNames[i]);
        results.push(result);
    }
    return results;
}

module.exports = deleteConnectors;
