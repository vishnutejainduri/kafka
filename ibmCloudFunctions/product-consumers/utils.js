const { MAX_BYTE_RESPONSE } = require('./constants');
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
    let failureIndexes = []
    const errors = messages.filter((result, index) => {
        if (result instanceof Error) {
            failureIndexes.push(index)
            return true
        }
    });

    return {
        successCount: messages.length - errors.length,
        failureIndexes,
        errors: errors.map((error, index) => ({ error, failureIndex: failureIndexes[index]}))
    };

};


/**
 * @param {[][]} batches Each entry in 'batches' is an array of items that has an 'originalIndexes' property. Specifically, each entry will have that property if 'batches' is created by groupByAttribute
 */
const passDownBatchedErrorsAndFailureIndexes = batches => results => {
    const batchesFailureIndexes = []
    const errors = results.filter((result,index) => {
        if (result instanceof Error) {
            batchesFailureIndexes.push(batches[index].originalIndexes)
            return true
        }
    });

    if (errors.length === 0) {
      return {
        ok: true,
        successCount: results.length
      };
    }

    return {
        successCount: results.length - errors.length,
        failureIndexes: batchesFailureIndexes.reduce((failureIndexes, batchFailureIndex) => [...batchFailureIndex, ...failureIndexes], []),
        errors: errors.map((error, index) => ({ error, failureIndex: batchesFailureIndexes[index]}))
    };
  };
  
/**
 * Catches the error returned from the main function and returns it as an instance of Error instead of throwing it
 * @param {function} main
 * @return {object|Error}
 */
function addErrorHandlingToMain (main) {
    return async function mainWithErrorHandling (params) {
        try {
            const result = await main(params);
            return result
        } catch (error) {
            return error instanceof Error ? error : new Error(error);
        }
    }
}

/**
 * Used to ensure that the result returned by the CF does not exceed the
 * maximum size
 */
const truncateErrorsIfNecessary = result => {
    if (!(result && typeof result === 'object')) return result;
    if (!result.errors || result.errors.length === 0) return result;

    const resultString = JSON.stringify(result);
    const byteCount = Buffer.byteLength(resultString);
    if (byteCount <= MAX_BYTE_RESPONSE) return result;

    return truncateErrorsIfNecessary({
        ...result,
        errors: result.errors.slice(0, result.errors.length / 2),
        errorsAreTruncated: true,
    });
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
        addErrorHandlingToMain(main)(params),
        logger.storeBatch(params)
    ]).then(async ([result]) => {
        if (result && result.failureIndexes && result.failureIndexes.length > 0) {
            await logger.updateBatchWithFailureIndexes(params, result.failureIndexes);
        }
        if (result instanceof Error) throw result;
        return truncateErrorsIfNecessary(result);
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
    passDownBatchedErrorsAndFailureIndexes,
    addRetries,
    truncateErrorsIfNecessary
}
