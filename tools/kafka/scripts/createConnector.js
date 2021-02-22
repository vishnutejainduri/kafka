const https = require('https');

const getSessionToken = require('../lib/getSessionToken');
const {
  retry,
  addErrorHandling,
  formatPathStart,
  getConnectorBaseObject,
  createConnectorObject,
  log
} = require('../utils');

function getCallCreateConnector(kubeHost, token, pathStart) {
    return function(connectorObject) {
        const options = {
            hostname: kubeHost.replace('https://', ''),
            port: 443,
            path: `${formatPathStart(pathStart)}/connectors`,
            method: 'POST',
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
            request.write(Buffer.from(JSON.stringify(connectorObject)));
            request.end();
        });
    }
}

function getCreateConnector(kubeHost, token, pathStart) {
  return async function(connectorObject) {
    const callCreateConnector = getCallCreateConnector(kubeHost, token, pathStart);
    log('Creating connector: ')
    log(JSON.stringify(connectorObject, null, 3));
    const { statusCode, body } = await callCreateConnector(connectorObject);
    if (statusCode < 200 || statusCode >= 300) {
      const errorMessage = `Server responded with status code ${statusCode} and could not create connector: ${connectorObject.name}.`
      throw new Error(body);
    }
    log(`Success: connector created: ${connectorObject.name}`);
    return body;
  }
}

async function createConnector(kubeParams, connectorConfig, connectionUrl, versionKey = 'version') {
    const token = await getSessionToken(kubeParams);
    const createConnector = addErrorHandling(retry(getCreateConnector(kubeParams.host, token, kubeParams.pathStart)));
    const connectorObject = createConnectorObject(connectorConfig.config, { filename: connectorConfig.name, version: connectorConfig.config[versionKey], connectionUrl });
    return createConnector(connectorObject)
}

module.exports = createConnector;
