const { retry, extractFilenameAndVersion } = require('../utils');

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

describe('getConnectorFilenameAndVersion', () => {
  it('extracts the filename from name with version', () => {
    const instanceName = 'style-basic-jdbc-source-v16';
    const expectedFileName = 'style-basic-jdbc-source';
    const { fileName } = extractFilenameAndVersion(instanceName);
    expect(fileName).toEqual(expectedFileName);
  });

  it('extracts the filename from name without version', () => {
    const instanceName = 'style-basic-jdbc-source';
    const expectedFileName = 'style-basic-jdbc-source';
    const { fileName } = extractFilenameAndVersion(instanceName);
    expect(fileName).toEqual(expectedFileName);
  });

  it('extracts the version from name with version', () => {
    const instanceName = 'style-basic-jdbc-source-v16';
    const expectedVersion = 16;
    const { version } = extractFilenameAndVersion(instanceName);
    expect(version).toEqual(expectedVersion);
  });

  it('does not extract the version from name without version', () => {
    const instanceName = 'style-basic-jdbc-source-v';
    const expectedVersion = null;
    const { version } = extractFilenameAndVersion(instanceName);
    expect(version).toEqual(expectedVersion);
  });
});
