const { truncateErrorsIfNecessary } = require('./utils');

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
