const { retry } = require('../utils');

describe('retry', () => {
    it('retries if the promise fails fewer times than the specified retries', async () => {
        // default retries is 3 times
        let failTries = 3;
        const promiseThatFails = async (shouldPass) => new Promise((resolve, reject) => {
            if (failTries === 0 && shouldPass === true) resolve('passed');
            failTries--;
            reject(new Error('failed'));
        });
        expect(await promiseThatFails(true).catch(error => error) instanceof Error).toBe(true);
        const promiseWithRetry = retry(promiseThatFails);
        expect(await promiseWithRetry(true)).toBe('passed');
    })
});
