const parseSkuMessageCt = require('../../../lib/parseSkuMessageCt');
const consumeSkuMessageCT = require('..');
const {
  getActionsFromSku,
  formatSkuRequestBody,
  existingCtSkuIsNewer,
  getCtSkuFromCtStyle,
  getCtSkusFromCtStyle,
  getCtSkuAttributeValue,
  getCreationAction,
  getOutOfDateSkuIds,
  groupByStyleId
} = require('../utils');

jest.mock('@commercetools/sdk-client');
jest.mock('@commercetools/api-request-builder');
jest.mock('@commercetools/sdk-middleware-auth');
jest.mock('@commercetools/sdk-middleware-http');
jest.mock('node-fetch');

const validParams = {
  topicName: 'skus-connect-jdbc',
  messages: [{
      topic: 'skus-connect-jdbc',
      value: {
        ID:'skuId',
        STYLEID:'styleId',
        COLORID:'colorId',
        SIZEID: 'sizeId',
        SIZE: 'size',
        DIMENSION: 'dimension',
        LASTMODIFIEDDATE:1000000000,
        FKORGANIZATIONNO: '1'
      }
  }],
  mongoUri: 'mongo-uri',
  dbName: 'db-name',
  mongoCertificateBase64: 'mong-certificate',
  collectionName: 'skus',
  ctpProjectKey: 'key',
  ctpClientId: 'id',
  ctpClientSecret: 'secret',
  ctpAuthUrl: 'authUrl',
  ctpApiUrl: 'apiUrl',
  ctpScopes: 'manage_products:harryrosen-dev'
};

describe('consumeSkuMessageCT', () => {
  it('throws an error if given params are invalid', () => {
    const invalidParams = {};
    return expect(consumeSkuMessageCT(invalidParams)).rejects.toThrow();
  });

  it('returns `undefined` if given valid params', async () => {
    const response = await consumeSkuMessageCT(validParams);
    expect(response).toBeUndefined();
  });
});

describe('getActionsFromSku', () => {
  const sku = { id: 'sku-01', styleId: '1', colorId: 'c1', sizeId: 's1'};

  it('returns an array', () => {
    expect(Array.isArray(getActionsFromSku(sku))).toBe(true);
  });

  it('returns the correct CT update actions', () => {
    const expectedActions = [
      {
        action: 'setAttribute',
        sku: 'sku-01',
        name: 'colorId',
        value: 'c1'
      },
      {
        action: 'setAttribute',
        sku: 'sku-01',
        name: 'sizeId',
        value: 's1'
      },
    ];
    const actualActions = getActionsFromSku(sku);

    expect(actualActions.length).toBe(expectedActions.length);
    expect(actualActions[0]).toMatchObject(expectedActions[0]);
    expect(actualActions[1]).toMatchObject(expectedActions[1]);
  });

  it('ignores attributes that are not defined on SKUs in CT', () => {
    const skuWithInvalidAttribute = { 'foo': 'bar' };
    const actualActions = getActionsFromSku(skuWithInvalidAttribute);
    expect(actualActions.length).toBe(0);
  });
});

describe('formatSkuRequestBody', () => {
  const sku = { id: 'sku-01', styleId: '1', colorId: 'c1', sizeId: 's1' };
  const style = {
    version: 1,
    masterData: {
      current: {
        variants: [],
        masterVariant: {
          attributes: [{ name: 'season', value: 'Winter 2020' }]
        }
      }
    },
    hasStagedChanges: false
  };

  const existingSku = { sku: 'sku-01', attributes: [] };

  it('returns a string', () => {
    expect(typeof formatSkuRequestBody(sku, style, true) === 'string').toBe(true);
  });

  it('returns the correct body to create a new SKU', () => {
    const expectedBody = '{"version":1,"actions":[{"action":"addVariant","sku":"sku-01","attributes":[{"name":"season","value":"Winter 2020"}]},{"action":"setAttribute","sku":"sku-01","name":"colorId","value":"c1"},{"action":"setAttribute","sku":"sku-01","name":"sizeId","value":"s1"}]}';
    const actualBody = formatSkuRequestBody(sku, style, null);
    expect(actualBody).toBe(expectedBody);
  });

  it('returns the correct body to update an existing a SKU', () => {
    const expectedBody = '{"version":1,"actions":[{"action":"setAttribute","sku":"sku-01","name":"colorId","value":"c1"},{"action":"setAttribute","sku":"sku-01","name":"sizeId","value":"s1"}]}';
    const actualBody = formatSkuRequestBody(sku, style, existingSku);
    expect(actualBody).toBe(expectedBody);
  });

  // TODO: Add more test cases to be sure that nullish values are handled
  // correctly. See comments to`isExistingAttributeOrNonNullish` and
  // `hasNonNullishValue` for an explanation of what we need to look out for.
});

describe('existingCtSkuIsNewer', () => {
  const olderCtSku = { sku: 'sku-01', attributes: [{ name: 'skuLastModifiedInternal', value: new Date(0) }] };
  const newerCtSku = { sku: 'sku-01',  attributes: [{ name: 'skuLastModifiedInternal', value: new Date(100) }] };
  const jestaSku = { id: 'sku-01', styleId: '1', skuLastModifiedInternal: new Date(50) };

  it('returns `true` if CT SKU is newer than JESTA SKU', () => {
    expect(existingCtSkuIsNewer(newerCtSku, jestaSku)).toBe(true);
  });

  it('returns `false` if CT SKU is older than JESTA SKU', () => {
    expect(existingCtSkuIsNewer(olderCtSku, jestaSku)).toBe(false);
  });

  it('throws an error if given CT SKU lacks a last modified date', () => {
    const ctSkuWithMissingDate = { sku: 'sku-01', attributes: [] };
    expect(() => existingCtSkuIsNewer(ctSkuWithMissingDate, jestaSku)).toThrow('CT product variant lacks last modified date');
  });

  it('throws an error if given JESTA SKU lacks a last modified date', () => {
    const jestaSkuWithMissingDate = { id: 'sku-01', styleId: '1' };
    expect(() => existingCtSkuIsNewer(olderCtSku, jestaSkuWithMissingDate)).toThrow('JESTA SKU lacks last modified date');
  });
});

describe('getCtSkuFromCtStyle', () => {
  const ctStyle = {
    masterData: {
      current: {
        variants: [{ sku: 'sku-1' }],
        masterVariant: {
          attributes: []
        }
      },
      hasStagedChanges: false
    }
  };

  const ctStyleWithStagedChanges = {
    masterData: {
      staged: {
        variants: [{ sku: 'sku-2' }],
        masterVariant: {
          attributes: []
        }
      },
      hasStagedChanges: true
    }
  };

  it('returns the matching current SKU if one exists', () => {
    expect(getCtSkuFromCtStyle('sku-1', ctStyle)).toMatchObject({ sku: 'sku-1' });
  });

  it('returns the matching staged SKU if one exists', () => {
    expect(getCtSkuFromCtStyle('sku-2', ctStyleWithStagedChanges)).toMatchObject({ sku: 'sku-2' });
  });

  it('returns `undefined` if no matching SKU exists', () => {
    expect(getCtSkuFromCtStyle('sku-3', ctStyle, true)).toBeUndefined();
    expect(getCtSkuFromCtStyle('sku-3', ctStyleWithStagedChanges)).toBeUndefined();
  });
});

describe('parseStyleMessageCt', () => {
  const rawMessage = validParams.messages[0];
  const parsedMessage = parseSkuMessageCt(rawMessage);

  it('handles dates correctly', () => {
    expect(parsedMessage.skuLastModifiedInternal instanceof Date).toBe(true);
    expect(parsedMessage.skuLastModifiedInternal.toString()).toBe(new Date(1000000000).toString());
  });

  it('handles sizes correctly', () => {
    const englishSize = 'size'
    const messageThatLacksASize = { value: { SIZE: null } };

    expect(parsedMessage.size['en-CA']).toBe(englishSize);
    expect(parseSkuMessageCt(messageThatLacksASize).size['en-CA']).toBe('');
  });

  it('handles sizeIds correctly', () => {
    const messageWithANumberForSizeId = { value: { SIZEID: 1 } };
    expect(parseSkuMessageCt(messageWithANumberForSizeId).sizeId).toBe('1');
  });

  it('includes all relevant attributes', () => {
    const expectedMessage = {
      id: 'skuId',
      styleId:'styleId',
      colorId: 'colorId',
      sizeId: 'sizeId',
      size: { 'en-CA': 'size' },
      dimensionId: 'dimension',
    };

    expect(parsedMessage).toMatchObject(expectedMessage);
  });
});

describe('getCtSkuAttributeValue', () => {
  const ctSku = { sku: 'sku-01', attributes: [{ name: 'foo', value: 1 }, { name: 'bar', value: 2 }] };

  it('returns the correct value of an existing attribute', () => {
    expect(getCtSkuAttributeValue(ctSku, 'foo')).toBe(1);
    expect(getCtSkuAttributeValue(ctSku, 'bar')).toBe(2);
  });

  it('it returns `undefined` when the given attribute does not exist', () => {
    expect(getCtSkuAttributeValue(ctSku, 'baz')).toBeUndefined();
  });
});

describe('getCreationAction', () => {
  const sku = { id: 'sku-01', styleId: '1', colorId: 'c1', sizeId: 's1' };

  const ctStyleWithNoStagedChanges = {
    masterData: {
      current: {
        masterVariant: {
          attributes: [{ name: 'brand', value: 'foo' }]
        }
      },
      hasStagedChanges: false
    }
  };

  const ctStyleWithStagedChanges = {
    masterData: {
      staged: {
        masterVariant: {
          attributes: [{ name: 'brand', value: 'foo' }]
        }
      },
      hasStagedChanges: true
    }
  };

  const expected = {
    action: 'addVariant',
    sku: 'sku-01',
    attributes: [{ name: 'brand', value: 'foo' }]
  };

  it('returns the correct object when given the style has no staged changes', () => {
    expect(getCreationAction(sku, ctStyleWithNoStagedChanges)).toMatchObject(expected);
  });

  it('returns the correct object when given style has staged changes', () => {
    expect(getCreationAction(sku, ctStyleWithStagedChanges)).toMatchObject(expected);
  });
});

describe('groupByStyleId', () => {
  const sku1 =  { id: 'sku-1', styleId: 'style-1'};
  const sku2 =  { id: 'sku-2', styleId: 'style-1'};
  const sku3 =  { id: 'sku-3', styleId: 'style-2'};

  it('returns correctly grouped SKUs when some have matching style IDs', () => {
    const skusSomeWithMatchingStyleIds = [sku1, sku2, sku3];
    const expected = [[sku1, sku2], [sku3]];
    expect(groupByStyleId(skusSomeWithMatchingStyleIds)).toEqual(expected);
  });

  it('returns correctly grouped SKUs when none have matching style IDs', () => {
    const skusAllWithDifferentStyleIds = [sku1, sku3];
    const expected = [[sku1], [sku3]];
    expect(groupByStyleId(skusAllWithDifferentStyleIds)).toEqual(expected);
  });

  it('returns correctly grouped SKU when given a single SKU', () => {
    const singleSku = [sku1];
    const expected = [[sku1]];
    expect(groupByStyleId(singleSku)).toEqual(expected);
  });

  it('returns an empty array if given an empty array', () => {
    expect(groupByStyleId([])).toEqual([]);
  });
});

describe('getCtSkusFromCtStyle', () => {
  const ctStyle = {
    masterData: {
      current: {
        variants: [{ sku: 'sku-1' }, { sku: 'sku-2'}, { sku: 'sku-3' }],
        masterVariant: {
          attributes: []
        }
      },
      hasStagedChanges: false
    }
  };

  it('returns an empty array if no matching SKUs exist on the style', () => {
    const skus = [{ id: 'sku-4'}, { id: 'sku-5' }];
    expect(getCtSkusFromCtStyle(skus, ctStyle)).toEqual([]);
  });

  it('returns an array of matching SKUs when some exist', () => {
    const skus = [{ id: 'sku-1'}, { id: 'sku-2' }];
    expect(getCtSkusFromCtStyle(skus, ctStyle)).toEqual([{ sku: 'sku-1' }, { sku: 'sku-2'}]);
  });
});

describe('getOutOfDateSkuIds', () => {
  const ctSkuAttributes = [{ name: 'skuLastModifiedInternal', value: new Date(50) }];

  const ctSkus = [
    { sku: 'sku-1', skuLastModifiedInternal: new Date(50), attributes: ctSkuAttributes },
    { sku: 'sku-2', skuLastModifiedInternal: new Date(50), attributes: ctSkuAttributes },
    { sku: 'sku-3', skuLastModifiedInternal: new Date(50), attributes: ctSkuAttributes }
  ];

  const outOfDateSku1 = { id: 'sku-1', skuLastModifiedInternal: new Date(0) };
  const outOfDateSku2 = { id: 'sku-2', skuLastModifiedInternal: new Date(0) };
  const outOfDateSku3 = { id: 'sku-3', skuLastModifiedInternal: new Date(0) };

  const upToDateSku1 = { id: 'sku-1', skuLastModifiedInternal: new Date(100) };
  const upToDateSku2 = { id: 'sku-2', skuLastModifiedInternal: new Date(100) };
  const upToDateSku3 = { id: 'sku-3', skuLastModifiedInternal: new Date(100) };

  it('returns an array with the out of date SKU IDs', () => {
    expect(getOutOfDateSkuIds(ctSkus, [outOfDateSku1, upToDateSku2, outOfDateSku3])).toEqual(['sku-1', 'sku-3']);
    expect(getOutOfDateSkuIds(ctSkus, [outOfDateSku1, outOfDateSku2, upToDateSku3])).toEqual(['sku-1', 'sku-2']);
    expect(getOutOfDateSkuIds(ctSkus, [upToDateSku1, outOfDateSku2, upToDateSku3])).toEqual(['sku-2']);
  });

  it('returns an empty array when there are no out of date SKUs', () => {
    expect(getOutOfDateSkuIds(ctSkus, [upToDateSku1, upToDateSku2])).toEqual([]);
  });
});
