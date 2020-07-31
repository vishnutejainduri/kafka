
const { Kafka } = require('kafkajs');

const { addErrorHandling } = require('../utils');

const {
    getUpdateRetryBatch,
    getDeleteRetryBatch,
    getRetryBatches
} = require('../../lib/messagesLogs');

const {
    getTopicMessages,
    getTopicValuesWithUpdatedRetriesMetadata,
    groupMessagesByRetryTime,
    groupResultByStatus,
} = require('./utils');

let cachedProducer = null;

async function getProducer({ brokers, username, password }){
    if (!cachedProducer) {
        const kafka = new Kafka({
            clientId: 'handleMessagesLogsCloudFunction',
            brokers,
            authenticationTimeout: 30000,
            ssl: true,
            sasl: {
                mechanism: 'plain', // scram-sha-256 or scram-sha-512
                username,
                password
            },
        });
        cachedProducer = kafka.producer();
    }
    await cachedProducer.connect();
    return cachedProducer;
}

async function requeueMessages(params, messages) {
    const producer = await getProducer({
        brokers: typeof params.kafkaBrokers === 'string' ? params.kafkaBrokers.split(",") : params.kafkaBrokers,
        username: params.kafkaUsername,
        password: params.kafkaPassword
    });

    return producer.sendBatch({
        topicMessages: getTopicMessages(getTopicValuesWithUpdatedRetriesMetadata(messages))
    })
}

// if some of the messages should be later we keep those,
// otherwise we delete the batch record 
async function cleanupRetryBatch(params, activationId, messages) {
    if (messages.length === 0) {
        const deleteRetryBatch = await getDeleteRetryBatch(params);
        return {
            deleted: await deleteRetryBatch(activationId)
        };
    } else {
        const updateRetryBatch = await getUpdateRetryBatch(params);
        return {
            updated: await updateRetryBatch(activationId, { messages })
        };
    }
}

function getRequeueMessagesAndCleanupRetryBatch(params) {
    return async function({ activationId, messages }) {
        const { now, later } = groupMessagesByRetryTime(messages);
        const requeueResult = await requeueMessages(params, now);
        const cleanupResult = await cleanupRetryBatch(params, activationId, later);
        return {
            requeueResult,
            cleanupResult
        };
    }
}

global.main = async function(params) {
    const retryBatches = await getRetryBatches(params);
    const requeueMessagesAndCleanupRetryBatch = getRequeueMessagesAndCleanupRetryBatch(params);
    let results = []
    for (const batch of retryBatches) {
        const result = await addErrorHandling(requeueMessagesAndCleanupRetryBatch)(batch)
        results.push(result)
    }
    return groupResultByStatus(results)
}

module.exports = global.main;
