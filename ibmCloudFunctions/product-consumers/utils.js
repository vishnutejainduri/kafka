const messagesLogs = require('../lib/messagesLogs');
 
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

// TODO log should behave similar to console.log, replace all usages where level = "ERROR" with log.error
const log = msg => {
    if (process.env.NODE_ENV === "test") return;
    console.log(msg);
}

log.error = (msg) => {
    if (process.env.NODE_ENV === "test") return;
    console.error(msg);
}

log.warn = (msg) => {
    if (process.env.NODE_ENV === "test") return;
    console.warn(msg);
}

/**
 * @param {{ index: number, error: Object, message: Object }[]}  messageFailures
 */
log.messageFailures = (messageFailures) => {
    messageFailures.forEach(({ message, error }) => {
        log.error(`Message failure: ${JSON.stringify(message)} failed with error: ${error}`);
    });
}

const MESSAGES_LOG_ERROR = 'MESSAGES LOG ERROR.';

const createLog = {
    messagesLog: {
        failedToResolveBatch: (error) => `${MESSAGES_LOG_ERROR} Failed to resolve batch of messages: ${error}`
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

/**
 * Stores the messages of the params passed to the `main` function of a CF in a database,
 * so that we can retry the failed messaegs later.
 * @param main {function}
 * @param logger {{ storeBatch: function, updateBatchWithFailureIndexes: function }}
 */
const addLoggingToMain = (main, logger = messagesLogs) => (async params => (
    Promise.all([
        // Promise.all will prematurely return if any of the promises is rejected, but we want storeBatch to finish even if  main function fails 
        main(params).catch(error => error instanceof Error ? error : new Error(error)),
        logger.storeBatch(params)
    ]).then(async ([result]) => {
        if (result && result.failureIndexes && result.failureIndexes.length > 0) {
            await logger.updateBatchWithFailureIndexes(params, result.failureIndexes);
        }
        if (result instanceof Error) throw result;
        return result;
    })
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
 * called with an error string when an error is caught. Also optionally takes
 * an array of numbers, `doNotRetryCodes`. If an error's code matches a number in
 * `doNotRetryCodes`, the function will not retry even if it has not yet reached
 * the retry limit.
 * @param {Function} func 
 * @param {Number} retryLimit 
 * @param {Function} logger
 */
const addRetries = (func, retryLimit, logger = () => {}, doNotRetryCodes = []) => {
    const functionWithRetries = async (retries = 0, ...args) => {
        try {
            return await func(...args);
        } catch(err) {
            if (doNotRetryCodes.includes(err.code)) return err;
            logger(formatLoggerErrorMessage(retries, retryLimit, err));
            if (retries === retryLimit) return err;
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
    addLoggingToMain,
    passDownAnyMessageErrors,
    addRetries
}
