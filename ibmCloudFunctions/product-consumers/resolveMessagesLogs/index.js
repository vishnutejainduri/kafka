const { addErrorHandling } = require('../utils');
const rp = require('request-promise');

const {
    findUnresolvedBatches,
    getResolveBatch
} = require('../../lib/messagesLogs');

global.main = async function(params) {
    const unresolvedBatches = await findUnresolvedBatches(params);

    async function fetchActivationInfo(activationId) {
        return rp({
            uri: encodeURI(`${params.ibmcloudFunctionsRestEndpoint}/namespaces/${params.ibmcloudFunctionsRestNamespace}/activations/${activationId}`),
            method: 'GET',
            auth: {
                user: params.ibmcloudFunctionsRestUsername,
                pass: params.ibmcloudFunctionsRestPassword,
            },
            json: true
        })
    }

    const resolveBatch = await getResolveBatch(params);

    async function resolveBatchWithActivationInfo({ activationId }) {
        const info = await fetchActivationInfo(activationId);
        if (!info) return null;
        if (info.error) throw new Error(info.error);
        return resolveBatch(activationId, info);
    }

    const resolveBatchesInfo = await Promise.all(
        unresolvedBatches.map(addErrorHandling(resolveBatchWithActivationInfo))
    );

    return {
        unresolvedBatches,
        resolveBatchesInfo
    };
}

module.exports = global.main;
