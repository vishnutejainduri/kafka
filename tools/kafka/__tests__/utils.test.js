const { retry, extractFilenameAndVersion, getConnectorBaseObject } = require('../utils');

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
    const { filename } = extractFilenameAndVersion(instanceName);
    expect(filename).toEqual(expectedFileName);
  });

  it('extracts the filename from name without version', () => {
    const instanceName = 'style-basic-jdbc-source';
    const expectedFileName = 'style-basic-jdbc-source';
    const { filename } = extractFilenameAndVersion(instanceName);
    expect(filename).toEqual(expectedFileName);
  });

  it('extracts the version from name with version', () => {
    const instanceName = 'style-basic-jdbc-source-v16';
    const expectedVersion = 16;
    const { version } = extractFilenameAndVersion(instanceName);
    expect(version).toEqual(expectedVersion);
  });

  it('extracts the version from name with version and versionIncrease', () => {
    const instanceName = 'style-basic-jdbc-source-v16';
    const versionIncrease = 1;
    const expectedVersion = 16 + versionIncrease;
    const { version } = extractFilenameAndVersion(instanceName);
    expect(version).toEqual(expectedVersion);
  });

  it('does not extract the version from name without version', () => {
    const instanceName = 'style-basic-jdbc-source-v';
    const expectedVersion = null;
    const { version } = extractFilenameAndVersion(instanceName);
    expect(version).toEqual(expectedVersion);
  });

  it('extract the version from name without version but with version increase', () => {
    const instanceName = 'style-basic-jdbc-source-v';
    const versionIncrease = 10;
    const expectedVersion = versionIncrease;
    const { version } = extractFilenameAndVersion(instanceName, versionIncrease);
    expect(version).toEqual(expectedVersion);
  });
});

describe('getConnectorBaseObject', () => {
    it('returns an object with the same name if a valid connector name is passed to it', () => {
      const validName = 'style-basic-jdbc-source-v16';
      const { filename } = extractFilenameAndVersion(validName);
      const object = getConnectorBaseObject(filename);
      expect(typeof object === 'object').toEqual(true);
      expect(object.name).toEqual(filename);
    });

    it('returns null if a invalid connector name is passed to it', () => {
      const validName = '';
      const { filename } = extractFilenameAndVersion(validName);
      const object = getConnectorBaseObject(filename);
      expect(object).toEqual(null);
    });
});
