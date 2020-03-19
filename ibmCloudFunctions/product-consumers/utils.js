// NOTE: addErrorHandling should be used for all of the chained methods on array e.g. map, filter, etc.
// and you cannot wrap some methods with addErrorHandling while skipping others,
// because if one method returns an Error instance, the rest of the methods will simply bypass that Error
// if wrapped with addErrorHandling, otherwise you might end up with difficult to reason about bugs.
const addErrorHandling = (fn, createError) => {
    if (Promise.resolve(fn) == fn || fn.constructor.name === 'AsyncFunction') {
        return async arg => {
            if (arg instanceof Error) return arg;
            return fn(arg)
                .then(response => {
                    if (response && response.error) throw new Error(response.error);
                    return response;
                })
                .catch(error => createError ? createError(error, arg) : error);
        }
    }

    return arg => {
        if (arg instanceof Error) return arg;
        try {
            const result = fn(arg);
            if (result && result.error) throw new Error(result.error);
            return result;
        } catch(error) {
            return createError ? createError(error, arg) : error;
        }
    };
}

const log = (msg, level) => {
    if (process.env.NODE_ENV === "test") return;
    if (level === "ERROR") {  console.error(msg); }
    else {  console.log(msg); }
}

/**
 * @param {{ index: number, error: Object, message: Object }[]}  messageFailures
 */
log.messageFailures = (messageFailures) => {
    messageFailures.forEach(({ message, error }) => {
        log(`Message failure: ${JSON.stringify(message)} failed with error: ${error}`);
    });
}

const createLog = {
    messagesLog: {
        failedToStoreBatch: (error) => `Failed to store batch of messages: ${error}`,
        failedToResolveBatch: (error) => `Failed to resolve batch of messages: ${error}`,
        failedToUpdateBatchWithFailureIndexes: (error) => `Failed to update batch of messages with failure indexes: ${error}`
    },
    params: (cfName, params) => {
        const { messages, ...paramsExcludingMessages } = params;
        const messagesIsArray = Array.isArray(messages);

        return JSON.stringify({
            cfName,
            paramsExcludingMessages,
            messagesLength: messagesIsArray ? messages.length : null,
            sampleMessage: messages ? messages[0] : 'Does not have messages'
            // outputting only a single message,
            // because a long message will truncate the whole log and subsequent logs will be lost
        });
    }
}

const validateParams = params => {
    if (!params.topicName) {
      throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
      throw new Error('Invalid arguments. Must include \'messages\' JSON array with \'value\' field');
    }
};

const languageKeyMap = {
    en: 'en-CA',
    fr: 'fr-CA'
};
  
// CT expects language keys to include a locale (for example, the key for
// Canadian English is 'en-CA', not 'en'). The messages that
// `parseMessageStyle` returns have non-localized language keys. This function
// replaces the non-localized language keys in a message with localized ones.
const formatLanguageKeys = item => {
    if (!item) return item;
    if (typeof item !== 'object') return item;
    const keys = Object.keys(item);
    if (keys.length === 0) return item;

    return keys.reduce((newObject, key) => {
        if (key !== 'en' && key !== 'fr') {
            return {...newObject, [key]: formatLanguageKeys(item[key])};
        }
        // CT throws an error if you give it a language string set to `null`,
        // so we set all falsy language values to an empty string (which CT
        // accepts without issue).
        return {...newObject, [languageKeyMap[key]]: formatLanguageKeys(item[key]) || ''};
    }, {});
};

// Used to handle errors that occurred within particular promises in an array
// of promises. Should be used together with `addErrorHandling`.
// Based on the error handling code in `/product-consumers/consumeCatalogMessage/index.js`.
// Example usage is in `/product-consumers/consumeCatalogMessageCT/index.js`.
const passDownAnyMessageErrors = messages => {
    const errors = messages.filter(result => result instanceof Error);
    const successes = messages.filter(result => !(result instanceof Error));

    if (errors.length > 0) {
        const err = new Error(`${errors.length} of ${errors.length} updates failed. See 'failedUpdatesErrors'.`);
        err.failedUpdatesErrors = errors;
        err.successfulUpdatesResults = successes;
        throw err;
    }
};

// Adds logging to the `main` function of a CF. Takes the main function and
// the `messagesLogs` logger, defined in `/lib/messagesLog.js`.
const addLoggingToMain = (main, logger) => (async params => (
    Promise.all([
        main(params),
        logger.storeBatch(params)
    ]).then(([result]) => result)
  )
);

// Helper for `addRetries`
const formatLoggerErrorMessage = (retries, retryLimit, err) => (
    `Failed on attempt ${retries + 1}. (Retrying up to ${retryLimit - retries} more times.) Error: ${err}`
);
  
/**
 * Returns a function which will invoke `func` up to `retryLimit` times if the
 * previous invocation thew an error. After it reaches `retryLimit`, it throws
 * the most recent error it encountered. Optionally takes a `logger` which is
 * called with an error string when an error is caught.
 * @param {Function} func 
 * @param {Number} retryLimit 
 * @param {Function} logger
 */
const addRetries = (func, retryLimit, logger = () => {}) => {
    const functionWithRetries = async (retries = 0, ...args) => {
        try {
            return await func(...args);
        } catch(err) {
            logger(formatLoggerErrorMessage(retries, retryLimit, err));
            if (retries === retryLimit) throw err;
            return await functionWithRetries(retries + 1, ...args);
        }
    };

    return (...args) => functionWithRetries(0, ...args);
};

module.exports = {
    addErrorHandling,
    log,
    createLog,
    validateParams,
    formatLanguageKeys,
    addLoggingToMain,
    passDownAnyMessageErrors,
    addRetries
}
