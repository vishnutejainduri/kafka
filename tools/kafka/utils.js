function retry(fn, retries = 3) {
    return async function(...args){
        let tries = 0;
        let error = null;
        let response = null;
        while (!response && tries <= retries) {
            tries++;
            error = null;
            response = null;
            try {
                response = await fn(...args);
            } catch (err) {
                error = err;
            }
        }
        if (error) {
            throw error;
        }
        return response;
    }
}

module.exports = {
    retry
}