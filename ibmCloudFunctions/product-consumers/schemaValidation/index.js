const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });

const createError = require('../../lib/createError');
const { log } = require('../utils');

const addFacetsToBulkImportQueueSchema = require('../addFacetsToBulkImportQueue/schema.json');
const validators = {
    addFacetsToBulkImportQueue: {
        params: ajv.compile(addFacetsToBulkImportQueueSchema.params),
        message: ajv.compile(addFacetsToBulkImportQueueSchema.message)
    }
};

global.main = function(params) {
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
        return {
            ...params,
            messages: validMessages,
            invalidMessages
        };
    }

    return params;
};

module.exports = global.main;
