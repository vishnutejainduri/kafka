const { addErrorHandling } = require('../utils');
const rp = require('request-promise');

const {
    findUnresolvedBatches,
    getDeleteBatch,
    getFindMessagesValuesAndTopic,
    getStoreValues
} = require('../../lib/messagesLogs');

function updateValueWithActivationInfo({value, topic, activationInfo}) {
    const metadata = value.metadata || {};
    return {
        ...value,
        metadata: {
            ...metadata,
            topic,
            activationInfo,
            lastRetried: metadata.lastRetried || null,
            retries: metadata.retries || 0
        }
    }
}

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

    async function resolveBatchWithActivationInfo({ activationId }) {
        const activationInfo = await fetchActivationInfo(activationId);
        if (!activationInfo) return null;
        if (activationInfo.error) throw new Error(activationInfo.error);
        if (!activationInfo.response.success) {
            const findMessagesValuesAndTopic = await getFindMessagesValuesAndTopic(params);
            const { values, topic } = findMessagesValuesAndTopic(activationId);
            const valuesWithMetadata = values.map(value => updateValueWithActivationInfo({
                value,
                activationInfo: { ...activationInfo, activationId },
                topic
            }));
            const storeValues = await getStoreValues(params);
            await storeValues(valuesWithMetadata);
        }
        const deleteBatch = await getDeleteBatch(params);
        return deleteBatch(activationId);
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
