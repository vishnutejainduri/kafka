require('dotenv').config();

const getKubeEnv = require('./lib/getKubeEnv');
const getSessionToken = require('./lib/getSessionToken');
const parseConnectors = require('./lib/parseConnectors');

async function getConnectorNames(platformEnv) {
    const kubeParams = getKubeEnv(platformEnv);
    const token = await getSessionToken(kubeParams);
    return parseConnectors(kubeParams.host, token);
}

module.exports = getConnectorNames;
