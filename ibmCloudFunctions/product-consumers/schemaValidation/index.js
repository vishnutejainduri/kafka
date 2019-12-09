const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });

const createError = require('../../lib/createError');

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
            invalidMessages.push({ message, errors: validate.message.errors });
            return false;
        }
        return true;
    });
    return invalidMessages.length
        ? {
            ...params,
            messages: validMessages,
            invalidMessages
        }
        : params;
};

module.exports = global.main;
