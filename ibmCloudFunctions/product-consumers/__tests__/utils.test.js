const { addLoggingToMain, passDownBatchedErrorsAndFailureIndexes } = require('../utils');
const { groupByStyleId } = require('../../commercetools/consumeSkuMessageCT/utils');
const parseSkuMessageCt = require('../../lib/parseSkuMessageCt');

describe('addLoggingToMain', function() {
  it('finishes storing messages even if main is rejected and does not return an error', async function() {
    const failedMainError = 'failed main';
    const main = async () => Promise.reject(failedMainError);
    const logger = {
      async storeBatch () {
        return new Promise(function(resolve) {
          setTimeout(function() {
            resolve();
          }, 100);
        })
      }
    }
    const mainWithLogging = addLoggingToMain(main, logger);
    expect(await mainWithLogging()).toEqual(new Error(failedMainError));
  });

  it('it returns a error field in the response and 0 for storeBatchFailed if main has partial failure and we store the batch but we fail to update the batch with partial failures', async function() {
    const main = async () => Promise.resolve({ failureIndexes: [1] });
    const logger = {
      async storeBatch () {
        return new Promise(function(resolve) {
          setTimeout(function() {
            resolve();
          }, 100);
        })
      }
    }
    const mainWithLogging = addLoggingToMain(main, logger);
    const result = await mainWithLogging()
    expect(result.error).toEqual(new Error('updateBatchWithFailureIndexesFailed'));
    expect(result.storeBatchFailed).toEqual(0);
  });

  it('return error field in the response and 1 for storeBatchFailed if both storing the batch and the main fail', async function() {
    const failedMainError = 'failed main';
    const main = async () => Promise.reject(failedMainError);
    const logger = {
      async storeBatch () {
        return new Promise(function(_, reject) {
          setTimeout(function() {
            reject();
          }, 100);
        })
      }
    }
    const mainWithLogging = addLoggingToMain(main, logger);
    const result = await mainWithLogging()
    expect(result.error).toEqual(new Error(failedMainError));
    expect(result.storeBatchFailed).toEqual(1);
  });

  it('finishes storing messages if main does not return an error field in the response', async function() {
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
