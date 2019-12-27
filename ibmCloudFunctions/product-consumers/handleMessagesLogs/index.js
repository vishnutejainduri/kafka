const { Kafka } = require('kafkajs');

const {
    getRetryBatches,
    getUpdateRetryBatch,
    getDeleteRetryBatch,
} = require('../../lib/messagesLogs');
const { addErrorHandling } = require('../utils');

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

function getValuesWithUpdatedMetadataByTopic (messages) {
    return messages.reduce((byTopic, { value, topic }) => {
        const valueWithUpdatedMetadata = {
            ...value,
            metadata: {
                ...value.metadata,
                retries: value.metadata.retries + 1
            }
        };
        if (byTopic[topic]) {
            byTopic[topic].push(valueWithUpdatedMetadata);
        } else {
            byTopic[topic] = [valueWithUpdatedMetadata];
        }
        return byTopic;
    }, {});
}

async function requeueMessages(params, messages) {
    const producer = await getProducer({
        brokers: typeof params.kafkaBrokers === 'string' ? params.kafkaBrokers.split(",") : params.kafkaBrokers,
        username: params.kafkaUsername,
        password: params.kafkaPassword
    });

    const valuesByTopic = getValuesWithUpdatedMetadataByTopic(messages);

    const topicMessages = Object.entries(valuesByTopic)
        .reduce((reduced, [topic, values]) => {
            reduced.push({
                topic,
                values: values.map(JSON.stringify)
            })
        }, []);
        
    return producer.sendBatch({ topicMessages })
}

// if some of the messages should be later we keep those,
// otherwise we delete the batch record 
async function deleteOrUpdateRetryBatch(params, activationId, retryLater) {
    if (retryLater.length === 0) {
        const deleteRetryBatch = await getDeleteRetryBatch(params);
        return deleteRetryBatch(activationId);
    } else {
        const updateRetryBatch = await getUpdateRetryBatch(params);
        return updateRetryBatch(activationId, { messages: retryLater });
    }
}

function groupMessagesByRetryTime(messages) {
    const time = new Date().getTime();
    return messages.reduce(function ({ now, later }, message) {
        const nextRetry = message.value.metadata.nextRetry;
        (time >= nextRetry ? now : later).push(message);
        return { now, later }
    }, { now: [], later: [] });
}

async function handleBatch({ activationId, messages }, params) {
    const { now, later } = groupMessagesByRetryTime(messages);
    await requeueMessages(params, now);
    await deleteOrUpdateRetryBatch(params, activationId, later);
}

function groupResultByStatus(result) {
    return result
        .reduce(function ({ success, failure }, response) {
            (response instanceof Error ? failure : success).push(response);
            return { success, failure }
        },{ success: [], failure: []});
}

global.main = async function(params) {    
    const retryBatches = await getRetryBatches(params);
    const result = await Promise.all(retryBatches.map(addErrorHandling(handleBatch)));
    return groupResultByStatus(result)
}

module.exports = global.main;
