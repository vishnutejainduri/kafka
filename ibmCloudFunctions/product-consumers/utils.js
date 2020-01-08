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

module.exports = {
    addErrorHandling,
    log,
    createLog
}
