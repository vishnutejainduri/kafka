const { addLoggingToMain } = require('../utils');

describe('addLoggingToMain', function() {
  it('finishes storing messages even if main is rejected and still throws the error', async function() {
    const failedMainError = 'failed main';
    const main = async () => Promise.reject(failedMainError);
    let storedBatches = false;
    const logger = {
      async storeBatch () {
        return new Promise(function(resolve) {
          setTimeout(function() {
            storedBatches = true
            resolve();
          }, 100);
        })
      }
    }
    const mainWithLogging = addLoggingToMain(main, logger);
    await expect(mainWithLogging()).rejects.toThrow(failedMainError);
    expect(storedBatches).toEqual(true);
  });
  it('finishes storing messages if main does not throw an error', async function() {
    const successfulMain = 'successful main';
    const main = async () => successfulMain;
    let storedBatches = false;
    const logger = {
      async storeBatch () {
        return new Promise(function(resolve) {
          setTimeout(function() {
            storedBatches = true
            resolve();
          }, 100);
        })
      }
    }
    const mainWithLogging = addLoggingToMain(main, logger);
    await expect(mainWithLogging()).resolves.toEqual(successfulMain);
    expect(storedBatches).toEqual(true);
  });
});
