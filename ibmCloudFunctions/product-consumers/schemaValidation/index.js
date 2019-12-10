const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });
const { Kafka } = require('kafkajs');

const createError = require('../../lib/createError');
const { log } = require('../utils');

const addFacetsToBulkImportQueueSchema = require('../addFacetsToBulkImportQueue/schema.json');
const validators = {
    addFacetsToBulkImportQueue: {
        params: ajv.compile(addFacetsToBulkImportQueueSchema.params),
        message: ajv.compile(addFacetsToBulkImportQueueSchema.message)
    }
};

let cachedProducer = null;

async function getProducer({ brokers, username, password }){
    if (!cachedProducer) {
        const kafka = new Kafka({
            clientId: 'schemaValidation',
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
    const validate = validators[params.cfName];

    validate.params(params);
    if (validate.params.errors) {
        throw createError.failedSchemaValidation(
            validate.params.errors,
            params.cfName
        );
    }

    let invalidMessages = [];
    const validMessages = params.messages.filter(message => {
        validate.message(message);
        if (validate.message.errors) {
            invalidMessages.push({
                message,
                error: createError.failedSchemaValidation(
                    validate.message.errors,
                    `${params.cfName}:message`
                )
            });
            return false;
        }
        return true;
    });

    if (invalidMessages.length) {
        log(`${invalidMessages.length} invalid messages out of ${params.messages.lenth} messages.`);
        invalidMessages.forEach(({ message, error }) => {
            log(`Invalid message ${message} with error: ${error}`);
        });

        // Begin logging to kafka
        const producer = await getProducer({
            brokers: typeof params.kafkaBrokers === 'string' ? params.kafkaBrokers.split(",") : params.kafkaBrokers,
            username: params.kafkaUsername,
            password: params.kafkaPassword
        });

        await producer.send({
            topic: params.kafkainvalidMessagesDlqTopicName,
            messages: invalidMessages.map(message => ({ value: JSON.stringify(message) }))
        });
        // End login to kafka

        return {
            ...params,
            messages: validMessages,
            invalidMessages
        };
    }

    return params;
};

module.exports = global.main;
