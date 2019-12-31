
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
        return deleteRetryBatch(activationId);
    } else {
        const updateRetryBatch = await getUpdateRetryBatch(params);
        return updateRetryBatch(activationId, { messages });
    }
}

async function requeueMessagesAndCleanupRetryBatch({ activationId, messages }, params) {
    const { now, later } = groupMessagesByRetryTime(messages);
    await requeueMessages(params, now);
    return cleanupRetryBatch(params, activationId, later);
}

global.main = async function(params) {    
    const retryBatches = await getRetryBatches(params);
    const result = await Promise.all(retryBatches.map(addErrorHandling(requeueMessagesAndCleanupRetryBatch)));
    return groupResultByStatus(result)
}

module.exports = global.main;
