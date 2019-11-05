const addErrorHandling = fn => {
    if (Promise.resolve(fn) == fn || fn.constructor.name === 'AsyncFunction') {
        return async arg => {
            if (arg instanceof Error) return arg;
            return fn(arg).catch(error => error);
        }
    }

    return arg => {
        if (arg instanceof Error) return arg;
        try {
            return fn(arg);
        } catch(error) {
            return error;
        }
    };
}

const log = (msg, level) => {
    if (process.env.NODE_ENV === "test") return;
    if (level === "ERROR") {  console.error(msg); }
    else {  console.log(msg); }
}

const createLog = {
    params: (cfName, params) => {
        const { messages, ...paramsExcludingMessages } = params;
        const messagesIsArray = Array.isArray(messages);

        return JSON.stringify({
            cfName,
            paramsExcludingMessages,
            messagesLength: messagesIsArray ? messages.length : null,
            sampleMessage: messages[0]
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
