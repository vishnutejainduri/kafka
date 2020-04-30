const consumeSalesOrderDetailsMessageCT = require('..');
/*const { filterSalesOrderDetailsMessages, parseSalesOrderDetailsMessage } = require('../../../lib/parseSalesOrderDetailsMessage');
const {
  getActionsFromOrderDetail,
  getActionsFromOrderDetails,
  formatOrderDetailBatchRequestBody,
  existingCtOrderDetailIsNewer,
  getCtOrderDetailFromCtOrder,
  getCtOrderDetailsFromCtOrder,
  getOutOfDateOrderDetails,
  getMostUpToDateOrderDetail,
  removeDuplicateOrderDetails,
  groupByOrderNumber
} = require('../../orderUtils');*/

jest.mock('@commercetools/sdk-client');
jest.mock('@commercetools/api-request-builder');
jest.mock('@commercetools/sdk-middleware-auth');
jest.mock('@commercetools/sdk-middleware-http');
jest.mock('node-fetch');

const validParams = {
  topicName: 'sales-order-details-connect-jdbc',
  messages: [{
      topic: 'sales-order-details-connect-jdbc',
      value: {
        SALES_ORDER_ID: 67897,
        STATUS: 'status',
        BAR_CODE_ID: 'barcode',
        MODIFIED_DATE: 1000000000000
      }
  }],
  mongoUri: 'mongo-uri',
  dbName: 'db-name',
  mongoCertificateBase64: 'mong-certificate',
  ctpProjectKey: 'key',
  ctpClientId: 'id',
  ctpClientSecret: 'secret',
  ctpAuthUrl: 'authUrl',
  ctpApiUrl: 'apiUrl',
  ctpScopes: 'manage_cart_discounts:harryrosen-dev manage_order_edits:harryrosen-dev manage_orders:harryrosen-dev manage_my_orders:harryrosen-dev'
};

describe('consumeSalesOrderDetailsMessageCT', () => {
  it('throws an error if given params are invalid', () => {
    const invalidParams = {};
    return expect(consumeSalesOrderDetailsMessageCT(invalidParams)).rejects.toThrow();
  });

  it('returns `undefined` if given valid params', async () => {
    const response = await consumeSalesOrderDetailsMessageCT(validParams);
    expect(response).toBeUndefined();
  });
});

/*describe('getActionsFromOrderDetails', () => {
  const orderDetail = { id: 'orderDetail-01', styleId: '1', colorId: 'c1', sizeId: 's1'};

  it('returns an array', () => {
    expect(Array.isArray(getActionsFromOrderDetails(orderDetail))).toBe(true);
  });

  it('returns the correct CT update actions', () => {
    const expectedActions = [
      {
        action: 'setAttribute',
        orderDetail: 'orderDetail-01',
        name: 'colorId',
        value: 'c1'
      },
      {
        action: 'setAttribute',
        orderDetail: 'orderDetail-01',
        name: 'sizeId',
        value: 's1'
      },
    ];
    const actualActions = getActionsFromOrderDetails(orderDetail);

    expect(actualActions.length).toBe(expectedActions.length);
    expect(actualActions[0]).toMatchObject(expectedActions[0]);
    expect(actualActions[1]).toMatchObject(expectedActions[1]);
  });

  it('ignores attributes that are not defined on SKUs in CT', () => {
    const orderDetailWithInvalidAttribute = { 'foo': 'bar' };
    const actualActions = getActionsFromOrderDetails(orderDetailWithInvalidAttribute);
    expect(actualActions.length).toBe(0);
  });
});

describe('formatOrderDetailsRequestBody', () => {
  const orderDetail = { id: 'orderDetail-01', styleId: '1', colorId: 'c1', sizeId: 's1' };
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

  const existingOrderDetails = { orderDetail: 'orderDetail-01', attributes: [] };

  it('returns a string', () => {
    expect(typeof formatOrderDetailsRequestBody(orderDetail, style, true) === 'string').toBe(true);
  });

  it('returns the correct body to create a new SKU', () => {
    const expectedBody = '{"version":1,"actions":[{"action":"addVariant","orderDetail":"orderDetail-01","attributes":[{"name":"season","value":"Winter 2020"}],"staged":false},{"action":"setAttribute","orderDetail":"orderDetail-01","name":"colorId","value":"c1","staged":false},{"action":"setAttribute","orderDetail":"orderDetail-01","name":"sizeId","value":"s1","staged":false}]}';
    const actualBody = formatOrderDetailsRequestBody(orderDetail, style, null);
    expect(actualBody).toBe(expectedBody);
  });

  it('returns the correct body to update an existing a SKU', () => {
    const expectedBody = '{"version":1,"actions":[{"action":"setAttribute","orderDetail":"orderDetail-01","name":"colorId","value":"c1","staged":false},{"action":"setAttribute","orderDetail":"orderDetail-01","name":"sizeId","value":"s1","staged":false}]}';
    const actualBody = formatOrderDetailsRequestBody(orderDetail, style, existingOrderDetails);
    expect(actualBody).toBe(expectedBody);
  });

  // TODO: Add more test cases to be sure that nullish values are handled
  // correctly. See comments to`isExistingAttributeOrNonNullish` and
  // `hasNonNullishValue` for an explanation of what we need to look out for.
});

describe('existingCtOrderDetailsIsNewer', () => {
  const olderCtOrderDetails = { orderDetail: 'orderDetail-01', attributes: [{ name: 'orderDetailLastModifiedInternal', value: new Date(0) }] };
  const newerCtOrderDetails = { orderDetail: 'orderDetail-01',  attributes: [{ name: 'orderDetailLastModifiedInternal', value: new Date(100) }] };
  const jestaOrderDetails = { id: 'orderDetail-01', styleId: '1', orderDetailLastModifiedInternal: new Date(50) };

  it('returns `true` if CT SKU is newer than JESTA SKU', () => {
    expect(existingCtOrderDetailsIsNewer(newerCtOrderDetails, jestaOrderDetails)).toBe(true);
  });

  it('returns `false` if CT SKU is older than JESTA SKU', () => {
    expect(existingCtOrderDetailsIsNewer(olderCtOrderDetails, jestaOrderDetails)).toBe(false);
  });

  it('returns `false` if given CT SKU lacks a last modified date', () => {
    const ctOrderDetailsWithMissingDate = { orderDetail: 'orderDetail-01', attributes: [] };
    expect(existingCtOrderDetailsIsNewer(ctOrderDetailsWithMissingDate, jestaOrderDetails)).toBe(false);
  });

  it('throws an error if given JESTA SKU lacks a last modified date', () => {
    const jestaOrderDetailsWithMissingDate = { id: 'orderDetail-01', styleId: '1' };
    expect(() => existingCtOrderDetailsIsNewer(olderCtOrderDetails, jestaOrderDetailsWithMissingDate)).toThrow('JESTA SKU lacks last modified date');
  });
});

describe('getCtOrderDetailsFromCtStyle', () => {
  const ctStyle = {
    masterData: {
      current: {
        variants: [{ orderDetail: 'orderDetail-1' }],
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
        variants: [{ orderDetail: 'orderDetail-2' }],
        masterVariant: {
          attributes: []
        }
      },
      hasStagedChanges: true
    }
  };

  it('returns the matching current SKU if one exists', () => {
    expect(getCtOrderDetailsFromCtStyle('orderDetail-1', ctStyle)).toMatchObject({ orderDetail: 'orderDetail-1' });
  });

  it('returns the matching staged SKU if one exists', () => {
    expect(getCtOrderDetailsFromCtStyle('orderDetail-2', ctStyleWithStagedChanges)).toMatchObject({ orderDetail: 'orderDetail-2' });
  });

  it('returns `undefined` if no matching SKU exists', () => {
    expect(getCtOrderDetailsFromCtStyle('orderDetail-3', ctStyle, true)).toBeUndefined();
    expect(getCtOrderDetailsFromCtStyle('orderDetail-3', ctStyleWithStagedChanges)).toBeUndefined();
  });
});

describe('parseStyleMessageCt', () => {
  const rawMessage = validParams.messages[0];
  const parsedMessage = parseOrderDetailsMessageCt(rawMessage);

  it('handles dates correctly', () => {
    expect(parsedMessage.orderDetailLastModifiedInternal instanceof Date).toBe(true);
    expect(parsedMessage.orderDetailLastModifiedInternal.toString()).toBe(new Date(1000000000).toString());
  });

  it('handles sizes correctly', () => {
    const englishSize = 'size'
    const messageThatLacksASize = { value: { SIZE: null } };

    expect(parsedMessage.size['en-CA']).toBe(englishSize);
    expect(parseOrderDetailsMessageCt(messageThatLacksASize).size['en-CA']).toBe('');
  });

  it('handles sizeIds correctly', () => {
    const messageWithANumberForSizeId = { value: { SIZEID: 1 } };
    expect(parseOrderDetailsMessageCt(messageWithANumberForSizeId).sizeId).toBe('1');
  });

  it('includes all relevant attributes', () => {
    const expectedMessage = {
      id: 'orderDetailId',
      styleId:'styleId',
      colorId: 'colorId',
      sizeId: 'sizeId',
      size: { 'en-CA': 'size' },
      dimensionId: 'dimension',
    };

    expect(parsedMessage).toMatchObject(expectedMessage);
  });
});

describe('getCtOrderDetailsAttributeValue', () => {
  const ctOrderDetails = { orderDetail: 'orderDetail-01', attributes: [{ name: 'foo', value: 1 }, { name: 'bar', value: 2 }] };

  it('returns the correct value of an existing attribute', () => {
    expect(getCtOrderDetailsAttributeValue(ctOrderDetails, 'foo')).toBe(1);
    expect(getCtOrderDetailsAttributeValue(ctOrderDetails, 'bar')).toBe(2);
  });

  it('it returns `undefined` when the given attribute does not exist', () => {
    expect(getCtOrderDetailsAttributeValue(ctOrderDetails, 'baz')).toBeUndefined();
  });
});

describe('getCreationAction', () => {
  const orderDetail = { id: 'orderDetail-01', styleId: '1', colorId: 'c1', sizeId: 's1' };

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
    orderDetail: 'orderDetail-01',
    attributes: [{ name: 'brand', value: 'foo' }],
  };

  it('returns the correct object when given the style has no staged changes', () => {
    expect(getCreationAction(orderDetail, ctStyleWithNoStagedChanges)).toMatchObject(expected);
  });

  it('returns the correct object when given style has staged changes', () => {
    expect(getCreationAction(orderDetail, ctStyleWithStagedChanges)).toMatchObject(expected);
  });
});

describe('groupByStyleId', () => {
  const orderDetail1 =  { id: 'orderDetail-1', styleId: 'style-1'};
  const orderDetail2 =  { id: 'orderDetail-2', styleId: 'style-1'};
  const orderDetail3 =  { id: 'orderDetail-3', styleId: 'style-2'};

  it('returns correctly grouped SKUs when some have matching style IDs', () => {
    const orderDetailsSomeWithMatchingStyleIds = [orderDetail1, orderDetail2, orderDetail3];
    const expected = [[orderDetail1, orderDetail2], [orderDetail3]];
    expect(groupByStyleId(orderDetailsSomeWithMatchingStyleIds)).toEqual(expected);
  });

  it('returns correctly grouped SKUs when none have matching style IDs', () => {
    const orderDetailsAllWithDifferentStyleIds = [orderDetail1, orderDetail3];
    const expected = [[orderDetail1], [orderDetail3]];
    expect(groupByStyleId(orderDetailsAllWithDifferentStyleIds)).toEqual(expected);
  });

  it('returns correctly grouped SKU when given a single SKU', () => {
    const singleOrderDetails = [orderDetail1];
    const expected = [[orderDetail1]];
    expect(groupByStyleId(singleOrderDetails)).toEqual(expected);
  });

  it('returns an empty array if given an empty array', () => {
    expect(groupByStyleId([])).toEqual([]);
  });
});

describe('getCtOrderDetailssFromCtStyle', () => {
  const ctStyle = {
    masterData: {
      current: {
        variants: [{ orderDetail: 'orderDetail-1' }, { orderDetail: 'orderDetail-2'}, { orderDetail: 'orderDetail-3' }],
        masterVariant: {
          attributes: []
        }
      },
      hasStagedChanges: false
    }
  };

  it('returns an empty array if no matching SKUs exist on the style', () => {
    const orderDetails = [{ id: 'orderDetail-4'}, { id: 'orderDetail-5' }];
    expect(getCtOrderDetailssFromCtStyle(orderDetails, ctStyle)).toEqual([]);
  });

  it('returns an array of matching SKUs when some exist', () => {
    const orderDetails = [{ id: 'orderDetail-1'}, { id: 'orderDetail-2' }];
    expect(getCtOrderDetailssFromCtStyle(orderDetails, ctStyle)).toEqual([{ orderDetail: 'orderDetail-1' }, { orderDetail: 'orderDetail-2'}]);
  });
});

describe('getOutOfDateOrderDetailsIds', () => {
  const ctOrderDetailsAttributes = [{ name: 'orderDetailLastModifiedInternal', value: new Date(50) }];

  const ctOrderDetailss = [
    { orderDetail: 'orderDetail-1', orderDetailLastModifiedInternal: new Date(50), attributes: ctOrderDetailsAttributes },
    { orderDetail: 'orderDetail-2', orderDetailLastModifiedInternal: new Date(50), attributes: ctOrderDetailsAttributes },
    { orderDetail: 'orderDetail-3', orderDetailLastModifiedInternal: new Date(50), attributes: ctOrderDetailsAttributes }
  ];

  const outOfDateOrderDetails1 = { id: 'orderDetail-1', orderDetailLastModifiedInternal: new Date(0) };
  const outOfDateOrderDetails2 = { id: 'orderDetail-2', orderDetailLastModifiedInternal: new Date(0) };
  const outOfDateOrderDetails3 = { id: 'orderDetail-3', orderDetailLastModifiedInternal: new Date(0) };

  const upToDateOrderDetails1 = { id: 'orderDetail-1', orderDetailLastModifiedInternal: new Date(100) };
  const upToDateOrderDetails2 = { id: 'orderDetail-2', orderDetailLastModifiedInternal: new Date(100) };
  const upToDateOrderDetails3 = { id: 'orderDetail-3', orderDetailLastModifiedInternal: new Date(100) };

  it('returns an array with the out of date SKU IDs', () => {
    expect(getOutOfDateOrderDetailsIds(ctOrderDetailss, [outOfDateOrderDetails1, upToDateOrderDetails2, outOfDateOrderDetails3])).toEqual(['orderDetail-1', 'orderDetail-3']);
    expect(getOutOfDateOrderDetailsIds(ctOrderDetailss, [outOfDateOrderDetails1, outOfDateOrderDetails2, upToDateOrderDetails3])).toEqual(['orderDetail-1', 'orderDetail-2']);
    expect(getOutOfDateOrderDetailsIds(ctOrderDetailss, [upToDateOrderDetails1, outOfDateOrderDetails2, upToDateOrderDetails3])).toEqual(['orderDetail-2']);
  });

  it('returns an empty array when there are no out of date SKUs', () => {
    expect(getOutOfDateOrderDetailsIds(ctOrderDetailss, [upToDateOrderDetails1, upToDateOrderDetails2])).toEqual([]);
  });
});

describe('getActionsFromOrderDetailss', () => {
  const ctStyle = {
    masterData: {
      current: {
        variants: [{ orderDetail: 'orderDetail-1' }, { orderDetail: 'orderDetail-2'}, { orderDetail: 'orderDetail-3' }],
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

  const orderDetail1 = { id: 'orderDetail-1', orderDetailLastModifiedInternal: new Date(100), colorId: 'R' };
  const orderDetail2 = { id: 'orderDetail-2', orderDetailLastModifiedInternal: new Date(100), colorId: 'G' };
  const orderDetail3 = { id: 'orderDetail-3', orderDetailLastModifiedInternal: new Date(100), colorId: 'B' };
  const orderDetail4 = { id: 'orderDetail-4', orderDetailLastModifiedInternal: new Date(100), colorId: 'A' };

  it('returns the right actions when given only existing SKUs', () => {
    const orderDetails = [orderDetail1, orderDetail2, orderDetail3];
    const existingCtOrderDetailss = [{ orderDetail: 'orderDetail-1' }, { orderDetail: 'orderDetail-2'}, { orderDetail: 'orderDetail-3' }];
    const expected = [{"action": "setAttribute", "name": "orderDetailLastModifiedInternal", "orderDetail": "orderDetail-1", "value": new Date("1970-01-01T00:00:00.100Z"), "staged": false}, {"action": "setAttribute", "name": "colorId", "orderDetail": "orderDetail-1", "value": "R", "staged": false}, {"action": "setAttribute", "name": "orderDetailLastModifiedInternal", "orderDetail": "orderDetail-2", "value": new Date("1970-01-01T00:00:00.100Z"), "staged": false}, {"action": "setAttribute", "name": "colorId", "orderDetail": "orderDetail-2", "value": "G", "staged": false}, {"action": "setAttribute", "name": "orderDetailLastModifiedInternal", "orderDetail": "orderDetail-3", "value": new Date("1970-01-01T00:00:00.100Z"), "staged": false}, {"action": "setAttribute", "name": "colorId", "orderDetail": "orderDetail-3", "value": "B", "staged": false}];
    expect(getActionsFromOrderDetailss(orderDetails, existingCtOrderDetailss, ctStyle)).toEqual(expected);
  });

  it('returns the right actions when given both existing and new SKUs', () => {
    const orderDetails = [orderDetail1, orderDetail2, orderDetail3, orderDetail4];
    const existingCtOrderDetailss = [{ orderDetail: 'orderDetail-1' }, { orderDetail: 'orderDetail-2'}, { orderDetail: 'orderDetail-3' }];
    const expected = [{"action": "setAttribute", "name": "orderDetailLastModifiedInternal", "orderDetail": "orderDetail-1", "value": new Date("1970-01-01T00:00:00.100Z"), "staged": false}, {"action": "setAttribute", "name": "colorId", "orderDetail": "orderDetail-1", "value": "R", "staged": false}, {"action": "setAttribute", "name": "orderDetailLastModifiedInternal", "orderDetail": "orderDetail-2", "value": new Date("1970-01-01T00:00:00.100Z"), "staged": false}, {"action": "setAttribute", "name": "colorId", "orderDetail": "orderDetail-2", "value": "G", "staged": false}, {"action": "setAttribute", "name": "orderDetailLastModifiedInternal", "orderDetail": "orderDetail-3", "value": new Date("1970-01-01T00:00:00.100Z"), "staged": false}, {"action": "setAttribute", "name": "colorId", "orderDetail": "orderDetail-3", "value": "B", "staged": false}, {"action": "addVariant", "attributes": [{"name": "season", "value": "Winter"}], "staged": false, "orderDetail": "orderDetail-4"}, {"action": "setAttribute", "name": "orderDetailLastModifiedInternal", "orderDetail": "orderDetail-4", "value": new Date("1970-01-01T00:00:00.100Z"), "staged": false}, {"action": "setAttribute", "name": "colorId", "orderDetail": "orderDetail-4", "value": "A", "staged": false}];
    expect(getActionsFromOrderDetailss(orderDetails, existingCtOrderDetailss, ctStyle)).toEqual(expected);
  });

  it('returns an empty array when given an empty array of SKUs', () => {
    const existingCtOrderDetailss = [{ orderDetail: 'orderDetail-1' }, { orderDetail: 'orderDetail-2'}, { orderDetail: 'orderDetail-3' }];
    expect(getActionsFromOrderDetailss([], [], ctStyle)).toEqual([]);
    expect(getActionsFromOrderDetailss([], existingCtOrderDetailss, ctStyle)).toEqual([]);
  });
});

describe('formatOrderDetailsBatchRequestBody', () => {
  const ctStyle = {
    masterData: {
      current: {
        variants: [{ orderDetail: 'orderDetail-1' }, { orderDetail: 'orderDetail-2'}, { orderDetail: 'orderDetail-3' }],
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

  const orderDetail1 = { id: 'orderDetail-1', orderDetailLastModifiedInternal: new Date(100), colorId: 'R' };
  const orderDetail2 = { id: 'orderDetail-2', orderDetailLastModifiedInternal: new Date(100), colorId: 'G' };
  const orderDetail3 = { id: 'orderDetail-3', orderDetailLastModifiedInternal: new Date(100), colorId: 'B' };
  const orderDetail4 = { id: 'orderDetail-4', orderDetailLastModifiedInternal: new Date(100), colorId: 'A' };

  const orderDetails = [orderDetail1, orderDetail2, orderDetail3, orderDetail4];
  const existingCtOrderDetailss = [{ orderDetail: 'orderDetail-1' }, { orderDetail: 'orderDetail-2'}, { orderDetail: 'orderDetail-3' }];

  it('returns the correct request body', () => {
    const correctBody = "{\"version\":1,\"actions\":[{\"action\":\"setAttribute\",\"orderDetail\":\"orderDetail-1\",\"name\":\"orderDetailLastModifiedInternal\",\"value\":\"1970-01-01T00:00:00.100Z\",\"staged\":false},{\"action\":\"setAttribute\",\"orderDetail\":\"orderDetail-1\",\"name\":\"colorId\",\"value\":\"R\",\"staged\":false},{\"action\":\"setAttribute\",\"orderDetail\":\"orderDetail-2\",\"name\":\"orderDetailLastModifiedInternal\",\"value\":\"1970-01-01T00:00:00.100Z\",\"staged\":false},{\"action\":\"setAttribute\",\"orderDetail\":\"orderDetail-2\",\"name\":\"colorId\",\"value\":\"G\",\"staged\":false},{\"action\":\"setAttribute\",\"orderDetail\":\"orderDetail-3\",\"name\":\"orderDetailLastModifiedInternal\",\"value\":\"1970-01-01T00:00:00.100Z\",\"staged\":false},{\"action\":\"setAttribute\",\"orderDetail\":\"orderDetail-3\",\"name\":\"colorId\",\"value\":\"B\",\"staged\":false},{\"action\":\"addVariant\",\"orderDetail\":\"orderDetail-4\",\"attributes\":[{\"name\":\"season\",\"value\":\"Winter\"}],\"staged\":false},{\"action\":\"setAttribute\",\"orderDetail\":\"orderDetail-4\",\"name\":\"orderDetailLastModifiedInternal\",\"value\":\"1970-01-01T00:00:00.100Z\",\"staged\":false},{\"action\":\"setAttribute\",\"orderDetail\":\"orderDetail-4\",\"name\":\"colorId\",\"value\":\"A\",\"staged\":false}]}";
    expect(formatOrderDetailsBatchRequestBody(orderDetails, ctStyle, existingCtOrderDetailss)).toEqual(correctBody);
  });
});

describe('getMostUpToDateOrderDetails', () => {
  it('returns the most up to date SKU when given an array of SKUs', () => {
    const oldOrderDetails = { id: '1', orderDetailLastModifiedInternal: new Date(0) };
    const newestOrderDetails = { id: '1', orderDetailLastModifiedInternal: new Date(100) };
    const olderOrderDetails = { id: '1', orderDetailLastModifiedInternal: new Date(0)};
    const orderDetails = [oldOrderDetails, newestOrderDetails, olderOrderDetails];

    expect(getMostUpToDateOrderDetails(orderDetails)).toEqual(newestOrderDetails);
    expect(getMostUpToDateOrderDetails([oldOrderDetails])).toEqual(oldOrderDetails);
  });

  it('returns `undefined` when given an empty array', () => {
    expect(getMostUpToDateOrderDetails([])).toBeUndefined();
  });
});

describe('removeDuplicateOrderDetailss', () => {
  const orderDetail1 = { id: '1', orderDetailLastModifiedInternal: new Date(0), colorId: 'R' };
  const orderDetail1Duplicate1 = { id: '1', orderDetailLastModifiedInternal: new Date(50), colorId: 'G' };
  const orderDetail1Duplicate2 = { id: '1', orderDetailLastModifiedInternal: new Date(100), colorId: 'B' };
  const orderDetail2 = { id: '2', orderDetailLastModifiedInternal: new Date(0) };
  const orderDetail3 = { id: '3', orderDetailLastModifiedInternal: new Date(0) };

  it('returns an array matching the given array when there are no duplicate SKUs', () => {
    const orderDetailsWithNoDuplicates = [orderDetail1, orderDetail2, orderDetail3];
    expect(removeDuplicateOrderDetailss(orderDetailsWithNoDuplicates)).toEqual(orderDetailsWithNoDuplicates);
  });

  it('returns an array with oldest duplicate SKUs removed when given an array that contains duplicate SKUs', () => {
    const orderDetailsWithDuplicates = [orderDetail1, orderDetail1Duplicate1, orderDetail1Duplicate2, orderDetail2, orderDetail3];
    expect(removeDuplicateOrderDetailss(orderDetailsWithDuplicates)).toEqual([orderDetail1Duplicate2, orderDetail2, orderDetail3]);
  });
});
*/
