const https = require('https');
require('dotenv').config();

const getKubeEnv = require('./lib/getKubeEnv');
const getSessionToken = require('./lib/getSessionToken');
const { retry } = require('./utils');

function getDeleteConnector(kubeHost, token) {
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
            console.log("Deleting connector: ", connectorName);
            const request = https.request(options, function(res){
                let body = "";
                res.on('data', function(data) {
                   body += data;
                });
                res.on('end', function() {
                    //here we have the full response, html or json object
                    console.log(connectorName, " connector successfully deleted.");
                    resolve(JSON.parse(body));
                })
                res.on('error', function(e) {
                    console.log("Received an error while deleting connector: ", connectorName);
                    reject(e);
                });
            });
    
            request.end();
        });
    }
}

async function deleteConnectors(platformEnv, connectorNames) {
    const kubeParams = getKubeEnv(platformEnv);
    const token = await getSessionToken(kubeParams);
    const deleteConnector = getDeleteConnector(kubeParams.host, token)
    return Promise.all(connectorNames.map(retry(deleteConnector)))
}

module.exports = deleteConnectors;
