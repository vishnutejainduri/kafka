const { Kafka } = require('kafkajs');

const {
    findTimedoutBatchesActivationIds,
    getFindMessagesValuesAndTopic,
    getDeleteBatch
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

global.main = async function(params) {
    const time = new Date().getTime();
    const timedoutMessagesActivationIds = await findTimedoutBatchesActivationIds(params);
    
    const findMessagesValues = await getFindMessagesValuesAndTopic(params);

    const producer = await getProducer({
        brokers: typeof params.kafkaBrokers === 'string' ? params.kafkaBrokers.split(",") : params.kafkaBrokers,
        username: params.kafkaUsername,
        password: params.kafkaPassword
    });

    function valueShouldBeRetried({ metadata }) {
        if (!metadata) return true;
        const { lastRetry, retries } = metadata;
        const retryIntervalMinutes = 10 * retries;
        const maximumRetries = 120;
        if ((time - lastRetry)/(60 * 1000) < retryIntervalMinutes) return false;
        if (retries === maximumRetries) return false;
    }

    function updateValueMetadata(value) {
        const metadata = value.metadata || {};
        const retries = metadata.retries;
        return {
            ...value,
            metadata: {
                ...metadata,
                retries: retries ? retries + 1 : 1,
                lastRetry: time
            }
        }
    }

    async function requeueMessagesByActivationId(activationId) {
        // all the messages in a cloud function should come from the same topic
        // if a cloud function is fed with messages from two different topics, this should be reimplemented
        const { topic, values } = (await findMessagesValues(activationId));
        const stringifiedValues = values
            .filter(valueShouldBeRetried)
            .map(updateValueMetadata)
            .map(JSON.stringify);

        const produceResult = await producer.send({
            topic,
            messages: stringifiedValues.map(stringifiedValue => ({ value: stringifiedValue }))
        });
        const deleteBatch = await getDeleteBatch(params);
        const deleteResult = await deleteBatch(activationId);
        return {
            produceResult,
            deleteResult
        };
    }

    const requeueResult = await Promise.all(
        timedoutMessagesActivationIds.map(addErrorHandling(requeueMessagesByActivationId))
    );

    const failures = requeueResult.filter(result => result instanceof Error);
    if (failures.length) throw failures;
    return {
        requeueResult
    }; 
}

module.exports = global.main;
