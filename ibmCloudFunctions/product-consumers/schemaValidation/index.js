const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });

const createError = require('../../lib/createError');
const { log } = require('../utils');

const { storeInvalidMessages } = require('../../lib/messagesLogs');

const validators = [
    'addFacetsToBulkImportQueue',
    'addMediaContainerToQueue'
].reduce((_validators, cfName) => {
    const { params, message } = require(`../${cfName}/schema.json`);
    _validators[cfName] = {
        params: ajv.compile(params),
        message: ajv.compile(message)
    };
    return _validators;
}, {});
// e.g. -> validators = { addFacetsToBulkImportQueue: { params: ..., message: ... } };

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
            log(`Invalid message ${JSON.stringify(message)} with error: ${error}`);
        });

        const storeInvalidMessagesResult = await storeInvalidMessages(params, invalidMessages);

        return {
            ...params,
            messages: validMessages,
            invalidMessages,
            storeInvalidMessagesResult
        };
    }

    return params;
};

module.exports = global.main;
