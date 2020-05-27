const { addLoggingToMain, mapBatchIndexToMessageIndexes, passDownBatchedErrorsAndFailureIndexes } = require('../utils');

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
  const skuBatches = [
    [{ id: 'sku-1', styleId: 'style-1' }, { id: 'sku-2', styleId: 'style-1' }],
    [{ id: 'sku-3', styleId: 'style-2' }]
  ];

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


  it('it returns a success count when there were no errors', () => {
    const onlySuccessfulResults = [{}, {}, {}, {}];
    const expected = {
      ok: true,
      successCount: 4
    };

    expect(passDownBatchedErrorsAndFailureIndexes(skuBatches, messages)(onlySuccessfulResults)).toEqual(expected);
  })

  it('it returns an array of error indexes indicating which messages failed when there are errors', () => {
    const resultsIncludingFailures = [new Error(), {}];
    const expected = [0, 2];

    expect(passDownBatchedErrorsAndFailureIndexes(skuBatches, messages)(resultsIncludingFailures).failureIndexes).toEqual(expected);
  })
});

describe('mapBatchIndexToMessageIndexes', () => {
  const batches = [
    [{ id: 'sku-1', styleId: 'style-1' }, { id: 'sku-2', styleId: 'style-1' }],
    [{ id: 'sku-3', styleId: 'style-2' }]
  ];

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

  it('returns the indexes that correspond to the messages in the batch of the given index', () => {
    expect(mapBatchIndexToMessageIndexes({ batches, batchIndex: 0, messages})).toEqual([0, 2]);
    expect(mapBatchIndexToMessageIndexes({ batches, batchIndex: 1, messages})).toEqual([1]);
  });
});
