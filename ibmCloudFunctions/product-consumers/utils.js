const { MAX_BYTE_RESPONSE } = require('./constants');
const messagesLogs = require('../lib/messagesLogs');
const FAILURE_KEY = 'FAILURE'
 

/**
 * NOTE 1: addErrorHandling should be used for all of the chained methods on array e.g. map, filter, etc.
 * and you cannot wrap some methods with addErrorHandling while skipping others,
 * because if one method returns an Error instance, the rest of the methods will simply bypass that Error
 * if wrapped with addErrorHandling, otherwise you might end up with difficult to reason about bugs.
 * Note 2: if we don't want a message to be processed but it does not warrant an error, we simply can pass null along
 * Note 3: if a function wrapped by addErrorHandling returns a promise, that function should be declared 'async' otherwise addErrorHandling will not work
 * i.e. instead of 'function fn () { return Promise.resolve() }' use 'async function fn () => { return Promise.resolve() }'
 * @param {Function|async Function} fn Note that if fn returns a promise it SHOULD be declared as async
 * @param {Function|undefined} createError 
 */
const addErrorHandling = (fn, createError) => {
    if (Promise.resolve(fn) == fn || fn.constructor.name === 'AsyncFunction') {
        return async arg => {
            if (arg instanceof Error) return arg;
            if (arg === null) return null;
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
        if (arg === null) return null;
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

const getErrorsAndFailureIndexes = (results) => {
    let failureIndexes = []
    const errors = results.filter((result, index) => {
        if (result instanceof Error) {
            failureIndexes.push(index)
            return true
        }
    });
    return {
        failureIndexes,
        errors
    }
}

// Used to handle errors that occurred within particular promises in an array
// of promises. Should be used together with `addErrorHandling`.
// Based on the error handling code in `/product-consumers/consumeCatalogMessage/index.js`.
// Example usage is in `/product-consumers/consumeCatalogMessageCT/index.js`.
const passDownAnyMessageErrors = (results) => {
    const { errors, failureIndexes } = getErrorsAndFailureIndexes(results)
    const ignoredIndexes = results.reduce((ignoredIndexes, result, index) => {
        if (result === null) {
            ignoredIndexes.push(index)
        }
        return ignoredIndexes
    }, []);
   
    const result = {
        successCount: results.length - errors.length - ignoredIndexes.length,
        failureIndexes,
        errors: errors.map((error, index) => ({
            // expanding error to be visible in console logs e.g. logDNA
            errorMessage: error.message,
            errorStack: error.stack ? JSON.stringify(error.stack) : '',
            failureIndex: failureIndexes[index]
        }))
    };

    if (ignoredIndexes.length) {
        Object.assign(result, {
            ignoredIndexes,
            ignoredCount: ignoredIndexes.length,
            errorCount: errors.length
        });
    }

    return result;
};

/**
 * @param {[][]} batches Each entry in 'batches' is an array of items that has an 'originalIndexes' property. Specifically, each entry will have that property if 'batches' is created by groupByAttribute
 */
const passDownBatchedErrorsAndFailureIndexes = (batches, messages) => results => {
    const batchesFailureIndexes = []
    let messagesSuccessCount = 0
    const errors = results.filter((result,index) => {
        if (result instanceof Error) {
            batchesFailureIndexes.push(batches[index].originalIndexes)
            return true
        } else {
            messagesSuccessCount += batches[index].originalIndexes.length
        }
    });

    const batchSuccessCount = results.length - errors.length
    const messagesCount = messages.length

    if (errors.length === 0) {
      return {
        messagesCount,
        ok: true,
        batchSuccessCount 
      };
    }

    return {
        messagesCount,
        messagesSuccessCount,
        batches: batches.length,
        batchSuccessCount,
        batchesFailureIndexes,
        failureIndexes: batchesFailureIndexes.reduce((failureIndexes, batchFailureIndex) => [...batchFailureIndex, ...failureIndexes], []),
        errors: errors.map((error, index) => ({
            // expanding error to be visible in console logs e.g. logDNA
            errorMessage: error.message,
            errorStack: error.stack ? JSON.stringify(error.stack) : '',
            failureIndexes: batchesFailureIndexes[index]
        }))
    };
  };
  
// This function is useful if we want to send the same messages that were successfully processed by one step in a functions sequence to the next step
// Excluding messages that were not successfully processed ensures we won't cause an incosistency; note that messages that are ignored e.g. because they required no operation, will be passed on as well.
/**
 *  
 * @param {any[]} messages 
 * @param {[][]|undefined} batches If batches is present passDownBatchedErrorsAndFailureIndexes will be used instead of passDownAnyMessageErrors to calculate the results
 */
const passDownProcessedMessages = (messages, batches) => results => {
    const result = batches
        ? passDownBatchedErrorsAndFailureIndexes(batches, messages)(results)
        : passDownAnyMessageErrors(results)
    const failureIndexes = result.failureIndexes || []
    return {
        ...result,
        messages: messages.filter((_, index) => !failureIndexes.includes(index))
    }
}

/**
 * Catches the error returned from the function and returns it as an instance of Error instead of throwing it
 * @param {function} fn
 * @return {object|Error}
 */
function addErrorHandlingToFn (fn) {
    return async function fnWithErrorHandling (params) {
        try {
            const result = await fn(params);
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
 * Stores the messages of the params passed to the `main` function of a CF in a database, so that we can retry the failed messaegs later.
 * If the main result is not an instance of error, the main result will be passed as it was.
 * If the main result is an instance of error, the main result will be passed as 'error' field of the response.
 * If the main result is an instance of error, and we succeed in storing the batch to be retried later, storeBatchFailed will 0, but will be 1 if we don't succeed to store it.
 * If there is partial failure and we fail to update the batch with partial failures result, we treat this as if the main has failed and all of its messages has to be retried.
 * Note: OpenWhisk treats existene of an 'error' field in the response as failure; the main purpose of this utility function is not to affect how OpenWhisk behaves, but to provde the necessary info for the binding service and retry logic implemented via handle message logs and resolve message logs functions.
 * @param main {function}
 * @param logger {{ storeBatch: function, updateBatchWithFailureIndexes: function }}
 */
const addLoggingToMain = (main, logger = messagesLogs, alwaysResolveOffsets = false) => (async params => (
    Promise.all([
        // Promise.all will prematurely return if any of the promises is rejected, but we want storeBatch to finish even if  main function fails 
        addErrorHandlingToFn(main)(params),
        addErrorHandlingToFn(logger.storeBatch)(params)
    ]).then(async ([mainResult, storeBatchResult]) => {
        // returning 0 and 1 instead of true and false, since it's easier to infer result in case they are converted to string by OpenWhisk
        const storeBatchFailed = storeBatchResult instanceof Error ? 1 : 0

        const hasPartialFailure = mainResult && mainResult.failureIndexes && mainResult.failureIndexes.length > 0
        const hasAnyFailure = hasPartialFailure || mainResult instanceof Error || (mainResult && mainResult.error)
        const shouldResolveOffsets = (!storeBatchFailed || !hasAnyFailure || alwaysResolveOffsets) ? 1 : 0
        let updateBatchWithFailureIndexesFailed = 0
        let updateBatchWithFailureIndexesResult
        if (!storeBatchFailed && hasPartialFailure) {
            try {
                updateBatchWithFailureIndexesResult = await logger.updateBatchWithFailureIndexes(params, mainResult.failureIndexes);
                console.warn('Partial failure: ', mainResult.failureIndexes)
            } catch (_) {
                updateBatchWithFailureIndexesFailed = 1
            }
        }

        // if there is some failure but we cannot retry, then kafka / cloud functions binding service has to deal with the failure
        const mainFailed = mainResult instanceof Error || (mainResult && mainResult.error)
        if ((mainFailed || hasPartialFailure) && (storeBatchFailed || updateBatchWithFailureIndexesFailed)) {
            const error = function () {
                if (mainResult instanceof Error) {
                    console.error(FAILURE_KEY, JSON.stringify(mainResult))
                    return mainResult
                } else if (mainResult && mainResult.error) {
                    console.error(FAILURE_KEY, JSON.stringify(mainResult))
                    return mainResult.error
                } else {
                    console.error(FAILURE_KEY, JSON.stringify(mainResult))
                    return new Error('updateBatchWithFailureIndexesFailed')
                }
            }()
            const retryInfo = {
                storeBatchFailed,
                updateBatchWithFailureIndexesFailed,
                updateBatchWithFailureIndexesResult,
                storeBatchResult,
                error,
                shouldResolveOffsets
            }
            return truncateErrorsIfNecessary(hasPartialFailure ? { ...retryInfo, ...mainResult } : retryInfo)
        }

        return truncateErrorsIfNecessary(mainResult instanceof Error ? mainResult : { ...mainResult, shouldResolveOffsets })
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
    passDownProcessedMessages,
    passDownAnyMessageErrors,
    passDownBatchedErrorsAndFailureIndexes,
    addRetries,
    truncateErrorsIfNecessary
}
