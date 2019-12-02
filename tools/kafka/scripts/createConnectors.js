const https = require('https');

const getKubeEnv = require('../lib/getKubeEnv');
const getSessionToken = require('../lib/getSessionToken');
const {
  retry,
  addErrorHandling,
  getConnectorBaseObject,
  createConnectorObject,
  log
} = require('../utils');

function getCallCreateConnector(kubeHost, token) {
    return function(connectorObject) {
        const options = {
            hostname: kubeHost.replace('https://', ''),
            port: 443,
            path: `/connectors`,
            method: 'POST',
            body: connectorObject,
            headers: {
                Authorization: `${token.token_type} ${token.access_token}`,
                'Content-Type': 'application/json'
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
                    resolve({
                      statusCode: res.statusCode,
                      body
                    });
                })
                res.on('error', function(e) {
                    const errorMessage = `Error occured while calling the end point for creating connector: ${connectorObject.name}`;
                    log(errorMessage, 'error');
                    reject(e);
                });
            });

            request.end();
        });
    }
}

function getCreateConnector(kubeHost, token) {
  return async function(connectorObject) {
    const callDeleteConnector = getCallCreateConnector(kubeHost, token);
    log('Creating connector: ')
    log(JSON.stringify(connectorObject, null, 3));
    const { statusCode, body } = await callDeleteConnector(connectorObject);
    if (statusCode !== 200) {
      const errorMessage = `Server responded with status code ${statusCode} and could not create connector: ${connectorObject.name}.`
      log(errorMessage, 'error');
      throw new Error(errorMessage);
    }
    log(`Success: connector created: ${connectorObject.name}`);
    return body;
  }
}

async function createConnectors(platformEnv, connectorsFilenamesAndVersions, connectionUrl) {
    const kubeParams = getKubeEnv(platformEnv);
    const token = await getSessionToken(kubeParams);
    const createConnector = addErrorHandling(retry(getCreateConnector(kubeParams.host, token)));
    const connectorObjects = connectorsFilenamesAndVersions.map(({ version, filename }) => {
        const { config } = getConnectorBaseObject(filename);
        return createConnectorObject(config, { filename, version, connectionUrl });
    });
    return Promise.all(connectorObjects.map(createConnector));
}

module.exports = createConnectors;
