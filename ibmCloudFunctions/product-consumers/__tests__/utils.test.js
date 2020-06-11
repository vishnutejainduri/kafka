const { addLoggingToMain, passDownBatchedErrorsAndFailureIndexes } = require('../utils');
const { groupByStyleId } = require('../../commercetools/consumeSkuMessageCT/utils');
const parseSkuMessageCt = require('../../lib/parseSkuMessageCt');

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

describe('passDownBatchedErrorsAndFailureIndexes', () => {
  const messages = [
    {
      value: {
        ID: 'sku-1',
        STYLEID: 'style-1'
      }
    },
    {
      value: {
        ID: 'sku-3',
        STYLEID: 'style-2'
      }
    },
    {
      value: {
        ID: 'sku-2',
        STYLEID: 'style-1'
      }
    }
  ];

  const skuBatches = groupByStyleId(messages.map(parseSkuMessageCt))

  it('it returns a success count when there were no errors', () => {
    const onlySuccessfulResults = [{}, {}, {}, {}];
    const expected = {
      ok: true,
      successCount: 4
    };

    expect(passDownBatchedErrorsAndFailureIndexes(skuBatches)(onlySuccessfulResults)).toEqual(expected);
  })

  it('it returns an array of error indexes indicating which messages failed when there are errors', () => {
    const resultsIncludingFailures = [new Error(), {}];
    const expected = [0, 2];

    expect(passDownBatchedErrorsAndFailureIndexes(skuBatches)(resultsIncludingFailures).failureIndexes).toEqual(expected);
  })
});
