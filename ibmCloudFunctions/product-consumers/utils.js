const addErrorHandling = fn => {
    if (Promise.resolve(fn) === fn) {
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

module.exports = {
    addErrorHandling,
    log
}
