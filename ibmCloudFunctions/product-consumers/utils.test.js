const { passDown, truncateErrorsIfNecessary } = require('./utils');
const { groupByAttribute } = require('../lib/utils');

describe('truncateErrorsIfNecessary', () => {
  it('returns its argument if not given an object', () => {
    expect(truncateErrorsIfNecessary('abc')).toBe('abc');
    expect(truncateErrorsIfNecessary(undefined)).toBeUndefined();
  });

  it('returns its argument if given an object that is smaller than the limit', () => {
    const result = {
      errors: ['a', 'b', 'c'],
      failureIndexes: [0, 5, 8]
    };

    expect(truncateErrorsIfNecessary(result)).toEqual(result);
  });

  it('returns its argument if given an object that lacks an `errors` array', () => {
    const result = {
      foo: []
    };

    expect(truncateErrorsIfNecessary(result)).toEqual(result);
  });

  it('truncates the array of the `errors` property of the given object if the object is bigger than 5242880 bytes', () => {
    const errors = [0, 1, 2, 3, 4].map(() => 'x'.repeat(5242880 / 4)); // filler to make the object exceed 5242880 bytes
    const result = {
      failureIndexes: [0, 5, 8],
      errors
    };

    expect(truncateErrorsIfNecessary(result).errors.length).toBe(2);
  });
});

describe('passDown', () => {
  const messages = [{ id: '1' }, { id: '2' }]
  const results = [{ foo: true }]

  describe('it is not given batches of messages', () => {
    it('does not return processed messages when `includeProcessedMessages` is undefined', () => {
      expect(passDown({ messages })(results)).toEqual({
        errors: [],
        failureIndexes: [],
        successCount: 1      
      })
    });
  
    it('returns processed messages when `includeProcessedMessages` is set to true', () => {
      expect(passDown({ messages, includeProcessedMessages: true })(results)).toEqual({
        errors: [],
        failureIndexes: [],
        messages,
        successCount: 1
      })
    });
  });

  describe('it is given batches of messages', () => {
    const batches = groupByAttribute('id')(messages)

    it('returns batch success results and no processed messages when `includeProcessedMessages` is undefined', () => {
      expect(passDown({ messages, batches })(results)).toEqual({
        batchSuccessCount: 1,
        messagesCount: 2,
        ok: true
      });
    });

    it('returns batch success results and processed messages when `includeProcessedMessages` is true', () => {
      expect(passDown({ messages, batches, includeProcessedMessages: true })(results)).toEqual({
        batchSuccessCount: 1,
        messages,
        messagesCount: 2,
        ok: true
      });
    });
  });
});
