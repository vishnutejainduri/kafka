const parseSkuMessageCt = require('../../../lib/parseSkuMessageCt');
const {
  getActionsFromSku,
  getActionsFromSkus,
  formatSkuRequestBody,
  existingCtSkuIsNewer,
  getCtSkuFromCtStyle,
  getCtSkusFromCtStyle,
  getCtSkuAttributeValue,
  getCreationAction,
  getOutOfDateSkuIds,
  getMostUpToDateSku,
  removeDuplicateSkus,
  groupByStyleId,
  groupByN
} = require('../utils');
const { isStaged, entityStatus } = require('../../constantsCt');

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

describe('getActionsFromSku; image tests', () => {
  const sku = { id: 'sku-01', styleId: '1' };

  it('sku doesnt have image; add an image', () => {
    const existingSku = { id: 'sku-01', images: [] }
    const expectedActions = [
      {
        action: 'addExternalImage',
        sku: sku.id,
        image: {
          url: 'https://i1.adis.ws/i/harryrosen/1?$prp-4col-xl$',
          dimensions: {
            w: 242,
            h: 288
          }
        }
      }
    ];
    const actualActions = getActionsFromSku(sku, existingSku);

    expect(actualActions.length).toBe(expectedActions.length);
    expect(actualActions[0]).toMatchObject(expectedActions[0]);
  });

  it('sku has an image; same image so no updates', () => {
    const existingSku = { id: 'sku-01', images: [{ url: 'https://i1.adis.ws/i/harryrosen/1?$prp-4col-xl$',  dimensions: { w: 242, h: 288 } }] };
    const expectedActions = [];
    const actualActions = getActionsFromSku(sku, existingSku);

    expect(actualActions.length).toBe(expectedActions.length);
    expect(actualActions).toMatchObject(expectedActions);
  });

  it('sku has an image; different image so remove and insert new image', () => {
    const existingSku = { id: 'sku-01', images: [{ url: 'oldImageUrl',  dimensions: { w: 242, h: 288 } }] };
    const expectedActions = [
      {
        action: 'removeImage',
        sku: existingSku.sku,
        imageUrl: 'oldImageUrl'
      },
      {
        action: 'addExternalImage',
        sku: sku.id,
        image: {
          url: 'https://i1.adis.ws/i/harryrosen/1?$prp-4col-xl$',
          dimensions: {
            w: 242,
            h: 288
          }
        }
      }
    ];
    const actualActions = getActionsFromSku(sku, existingSku);

    expect(actualActions.length).toBe(expectedActions.length);
    expect(actualActions[0]).toMatchObject(expectedActions[0]);
    expect(actualActions[1]).toMatchObject(expectedActions[1]);
  });
});

describe('getActionsFromSku', () => {
  const sku = { id: 'sku-01', styleId: '1', colorId: 'c1', sizeId: 's1' };

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
      }
    ];
    const actualActions = getActionsFromSku(sku);

    expect(actualActions.length).toBe(expectedActions.length);
    expect(actualActions[0]).toMatchObject(expectedActions[0]);
    expect(actualActions[1]).toMatchObject(expectedActions[1]);
  });

  it('ignores attributes that are not defined on SKUs in CT; only image updates always present for CT', () => {
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
          attributes: [{ name: 'season', value: 'Winter 2020' }],
          images: []
        }
      }
    },
    hasStagedChanges: false
  };

  const existingSku = { sku: 'sku-01', attributes: [], images: [] };

  it('returns a string', () => {
    expect(typeof formatSkuRequestBody(sku, style, existingSku) === 'string').toBe(true);
  });

  it('returns the correct body to create a new SKU', () => {
    const expectedBody = '{"version":1,"actions":[{"action":"addVariant","sku":"sku-01","attributes":[{"name":"season","value":"Winter 2020"}],"images":[{"url":"https://i1.adis.ws/i/harryrosen/undefined?$prp-4col-xl$","dimensions":{"w":242,"h":288}}],"staged":false},{"action":"setAttribute","sku":"sku-01","name":"colorId","value":"c1","staged":false},{"action":"setAttribute","sku":"sku-01","name":"sizeId","value":"s1","staged":false}]}';
    const actualBody = formatSkuRequestBody(sku, style, null);
    expect(actualBody).toBe(expectedBody);
  });

  it('returns the correct body to update an existing a SKU', () => {
    const expectedBody = '{"version":1,"actions":[{"action":"setAttribute","sku":"sku-01","name":"colorId","value":"c1","staged":false},{"action":"setAttribute","sku":"sku-01","name":"sizeId","value":"s1","staged":false},{"action":"addExternalImage","sku":"sku-01","image":{"url":"https://i1.adis.ws/i/harryrosen/1?$prp-4col-xl$","dimensions":{"w":242,"h":288}},"staged":false}]}';
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

  it('returns `false` if given CT SKU lacks a last modified date', () => {
    const ctSkuWithMissingDate = { sku: 'sku-01', attributes: [] };
    expect(existingCtSkuIsNewer(ctSkuWithMissingDate, jestaSku)).toBe(false);
  });

  it('throws an error if given JESTA SKU lacks a last modified date', () => {
    const jestaSkuWithMissingDate = { id: 'sku-01', styleId: '1' };
    expect(() => existingCtSkuIsNewer(olderCtSku, jestaSkuWithMissingDate)).toThrow('JESTA SKU lacks last modified date');
  });
});

describe('getCtSkuFromCtStyle', () => {
  const ctStyle = {
    masterData: {
      [entityStatus]: {
        variants: [{ sku: 'sku-1' }],
        masterVariant: {
          attributes: []
        }
      },
      hasStagedChanges: isStaged
    }
  };

  it('returns the matching current SKU if one exists', () => {
    expect(getCtSkuFromCtStyle('sku-1', ctStyle)).toMatchObject({ sku: 'sku-1' });
  });

  it('returns `undefined` if no matching SKU exists', () => {
    expect(getCtSkuFromCtStyle('sku-3', ctStyle)).toBeUndefined();
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

  it('handles localized sizes correctly', () => {
    const rawMessageWithLocalizedSizes = {
      ...rawMessage,
      value: {
        ...rawMessage.value,
        SIZE_EN: 'English size',
        SIZE_FR: 'French size'
      }
    }
    const parsedMessageWithLocalizedSizes = parseSkuMessageCt(rawMessageWithLocalizedSizes);


    expect(parsedMessageWithLocalizedSizes.size).toEqual({
      'en-CA': 'English size',
      'fr-CA': 'French size'
    });
  })

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

  const ctStyle = {
    masterData: {
      [entityStatus]: {
        masterVariant: {
          attributes: [{ name: 'brand', value: 'foo' }]
        }
      },
      hasStagedChanges: isStaged
    }
  };

  const expected = {
    action: 'addVariant',
    sku: 'sku-01',
    attributes: [{ name: 'brand', value: 'foo' }],
  };

  it('returns the correct object when given the style with relevant changes', () => {
    expect(getCreationAction(sku, ctStyle)).toMatchObject(expected);
  });
});

describe('groupByStyleId', () => {
  const sku1 =  { id: 'sku-1', styleId: 'style-1'};
  const sku2 =  { id: 'sku-2', styleId: 'style-1'};
  const sku3 =  { id: 'sku-3', styleId: 'style-2'};

  it('returns correctly grouped SKUs when some have matching style IDs', () => {
    const skusSomeWithMatchingStyleIds = [sku1, sku2, sku3];
    const groupOne = [sku1, sku2]
    groupOne.originalIndexes = [0, 1]
    const groupTwo = [sku3]
    groupTwo.originalIndexes = [2]
    const expected = [groupOne, groupTwo];
    expect(groupByStyleId(skusSomeWithMatchingStyleIds)).toEqual(expected);
  });

  it('returns correctly grouped SKUs when none have matching style IDs', () => {
    const skusAllWithDifferentStyleIds = [sku1, sku3];
    const groupOne = [sku1]
    groupOne.originalIndexes = [0]
    const groupTwo = [sku3]
    groupTwo.originalIndexes = [1]
    const expected = [groupOne, groupTwo];
    expect(groupByStyleId(skusAllWithDifferentStyleIds)).toEqual(expected);
  });

  it('returns correctly grouped SKU when given a single SKU', () => {
    const singleSku = [sku1];
    const groupOne = [sku1]
    groupOne.originalIndexes = [0]
    const expected = [groupOne];
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

describe('getActionsFromSkus', () => {
  const ctStyle = {
    masterData: {
      current: {
        variants: [{ sku: 'sku-1' }, { sku: 'sku-2'}, { sku: 'sku-3' }],
        masterVariant: {
          attributes: [
            {name: 'season', value: 'Winter'}
          ]
        }
      },
      hasStagedChanges: false
    },
    version: 1
  };

  /*const sku1 = { id: 'sku-1', skuLastModifiedInternal: new Date(100), colorId: 'R' };
  const sku2 = { id: 'sku-2', skuLastModifiedInternal: new Date(100), colorId: 'G' };
  const sku3 = { id: 'sku-3', skuLastModifiedInternal: new Date(100), colorId: 'B' };
  const sku4 = { id: 'sku-4', skuLastModifiedInternal: new Date(100), colorId: 'A' };*/

  /*it('returns the right actions when given only existing SKUs', () => {
    const skus = [sku1, sku2, sku3];
    const existingCtSkus = [{ sku: 'sku-1', images: [{'url':''}] }, { sku: 'sku-2', images: [{'url':''}] }, { sku: 'sku-3', images: [{'url':''}] }];
    const expected = [{"action":"setAttribute","sku":"sku-1","name":"skuLastModifiedInternal","value": new Date("1970-01-01T00:00:00.100Z"),"staged":false},{"action":"setAttribute","sku":"sku-1","name":"colorId","value":"R","staged":false},{"action":"removeImage","sku":"sku-1","imageUrl":"","staged":false},{"action":"addExternalImage","sku":"sku-1","image":{"url":"https://i1.adis.ws/i/harryrosen/undefined?$prp-4col-xl$","dimensions":{"w":242,"h":288}},"staged":false},{"action":"setAttribute","sku":"sku-2","name":"skuLastModifiedInternal","value": new Date("1970-01-01T00:00:00.100Z"),"staged":false},{"action":"setAttribute","sku":"sku-2","name":"colorId","value":"G","staged":false},{"action":"removeImage","sku":"sku-2","imageUrl":"","staged":false},{"action":"addExternalImage","sku":"sku-2","image":{"url":"https://i1.adis.ws/i/harryrosen/undefined?$prp-4col-xl$","dimensions":{"w":242,"h":288}},"staged":false},{"action":"setAttribute","sku":"sku-3","name":"skuLastModifiedInternal","value": new Date("1970-01-01T00:00:00.100Z"),"staged":false},{"action":"setAttribute","sku":"sku-3","name":"colorId","value":"B","staged":false},{"action":"removeImage","sku":"sku-3","imageUrl":"","staged":false},{"action":"addExternalImage","sku":"sku-3","image":{"url":"https://i1.adis.ws/i/harryrosen/undefined?$prp-4col-xl$","dimensions":{"w":242,"h":288}},"staged":false}];
    expect(getActionsFromSkus(skus, existingCtSkus, ctStyle)).toEqual(expected);
  });*/

  /*it('returns the right actions when given both existing and new SKUs', () => {
    const skus = [sku1, sku2, sku3, sku4];
    const existingCtSkus = [{ sku: 'sku-1', images: [{'url':''}] }, { sku: 'sku-2', images: [{'url':''}] }, { sku: 'sku-3', images: [{'url':''}] }];
    const expected = [{"action":"setAttribute","sku":"sku-1","name":"skuLastModifiedInternal","value": new Date("1970-01-01T00:00:00.100Z"),"staged":false},{"action":"setAttribute","sku":"sku-1","name":"colorId","value":"R","staged":false},{"action":"removeImage","sku":"sku-1","imageUrl":"","staged":false},{"action":"addExternalImage","sku":"sku-1","image":{"url":"https://i1.adis.ws/i/harryrosen/undefined?$prp-4col-xl$","dimensions":{"w":242,"h":288}},"staged":false},{"action":"setAttribute","sku":"sku-2","name":"skuLastModifiedInternal","value": new Date("1970-01-01T00:00:00.100Z"),"staged":false},{"action":"setAttribute","sku":"sku-2","name":"colorId","value":"G","staged":false},{"action":"removeImage","sku":"sku-2","imageUrl":"","staged":false},{"action":"addExternalImage","sku":"sku-2","image":{"url":"https://i1.adis.ws/i/harryrosen/undefined?$prp-4col-xl$","dimensions":{"w":242,"h":288}},"staged":false},{"action":"setAttribute","sku":"sku-3","name":"skuLastModifiedInternal","value": new Date("1970-01-01T00:00:00.100Z"),"staged":false},{"action":"setAttribute","sku":"sku-3","name":"colorId","value":"B","staged":false},{"action":"removeImage","sku":"sku-3","imageUrl":"","staged":false},{"action":"addExternalImage","sku":"sku-3","image":{"url":"https://i1.adis.ws/i/harryrosen/undefined?$prp-4col-xl$","dimensions":{"w":242,"h":288}},"staged":false},{"action":"addVariant","sku":"sku-4","attributes":[{"name":"season","value":"Winter"}],"images":[{"url":"https://i1.adis.ws/i/harryrosen/undefined?$prp-4col-xl$","dimensions":{"w":242,"h":288}}],"staged":false},{"action":"setAttribute","sku":"sku-4","name":"skuLastModifiedInternal","value": new Date("1970-01-01T00:00:00.100Z"),"staged":false},{"action":"setAttribute","sku":"sku-4","name":"colorId","value":"A","staged":false},{"action":"addExternalImage","sku":"sku-4","image":{"url":"https://i1.adis.ws/i/harryrosen/undefined?$prp-4col-xl$","dimensions":{"w":242,"h":288}},"staged":false}];
    expect(getActionsFromSkus(skus, existingCtSkus, ctStyle)).toEqual(expected);
  });*/

  it('returns an empty array when given an empty array of SKUs', () => {
    const existingCtSkus = [{ sku: 'sku-1', images: [{'url':''}] }, { sku: 'sku-2', images: [{'url':''}] }, { sku: 'sku-3', images: [{'url':''}] }];
    expect(getActionsFromSkus([], [], ctStyle)).toEqual([]);
    expect(getActionsFromSkus([], existingCtSkus, ctStyle)).toEqual([]);
  });
});

describe('getMostUpToDateSku', () => {
  it('returns the most up to date SKU when given an array of SKUs', () => {
    const oldSku = { id: '1', skuLastModifiedInternal: new Date(0) };
    const newestSku = { id: '1', skuLastModifiedInternal: new Date(100) };
    const olderSku = { id: '1', skuLastModifiedInternal: new Date(0)};
    const skus = [oldSku, newestSku, olderSku];

    expect(getMostUpToDateSku(skus)).toEqual(newestSku);
    expect(getMostUpToDateSku([oldSku])).toEqual(oldSku);
  });

  it('returns `undefined` when given an empty array', () => {
    expect(getMostUpToDateSku([])).toBeUndefined();
  });
});

describe('removeDuplicateSkus', () => {
  const sku1 = { id: '1', skuLastModifiedInternal: new Date(0), colorId: 'R' };
  const sku1Duplicate1 = { id: '1', skuLastModifiedInternal: new Date(50), colorId: 'G' };
  const sku1Duplicate2 = { id: '1', skuLastModifiedInternal: new Date(100), colorId: 'B' };
  const sku2 = { id: '2', skuLastModifiedInternal: new Date(0) };
  const sku3 = { id: '3', skuLastModifiedInternal: new Date(0) };

  it('returns an array matching the given array when there are no duplicate SKUs', () => {
    const skusWithNoDuplicates = [sku1, sku2, sku3];
    expect(removeDuplicateSkus(skusWithNoDuplicates)).toEqual(skusWithNoDuplicates);
  });

  it('returns an array with oldest duplicate SKUs removed when given an array that contains duplicate SKUs', () => {
    const skusWithDuplicates = [sku1, sku1Duplicate1, sku1Duplicate2, sku2, sku3];
    expect(removeDuplicateSkus(skusWithDuplicates)).toEqual([sku1Duplicate2, sku2, sku3]);
  });
});

describe('groupByN', () => {
  it('returns an array of arrays, each sub-array of which contains 500 items', () => {
    const arrayWith1000Items = new Array(1000).fill(1);
    const expected = [
      new Array(500).fill(1),
      new Array(500).fill(1)
    ];

    expect(groupByN(500)(arrayWith1000Items)).toEqual(expected);
  });

  it('works when given an array whose length is not divisible by 500', () => {
    const arrayWith750Items = new Array(750).fill(1);
    const expected = [
      new Array(500).fill(1),
      new Array(250).fill(1)
    ];

    expect(groupByN(500)(arrayWith750Items)).toEqual(expected);
  });

  it('returns an empty array when given an empty array', () => {
    expect(groupByN(500)([])).toEqual([]);
  });

  it('returns an array containing its argument when given an array that contains less than 500 items', () => {
    const shortArray = [1, 1, 1];
    expect(groupByN(500)(shortArray)).toEqual([shortArray]);
  });
});
