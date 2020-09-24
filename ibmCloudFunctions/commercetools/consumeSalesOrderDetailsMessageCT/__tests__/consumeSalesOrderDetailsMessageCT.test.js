const consumeSalesOrderDetailsMessageCT = require('..');
const { filterSalesOrderDetailsMessages, parseSalesOrderDetailsMessage } = require('../../../lib/parseSalesOrderDetailsMessage');
const {
  addErrorHandling,
} = require('../../../product-consumers/utils');
const {
  getActionsFromOrderDetail,
  getActionsFromOrderDetails,
  formatOrderDetailBatchRequestBody,
  existingCtOrderDetailIsNewer,
  getCtOrderDetailFromCtOrder,
  getCtOrderDetailsFromCtOrder,
  groupByOrderNumber,
  getOutOfDateOrderDetailIds,
  getMostUpToDateOrderDetail,
  removeDuplicateOrderDetails
} = require('../../orderUtils');
const { createClient } = require('@commercetools/sdk-client');

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
        ORDER_NUMBER: '67897',
        STATUS: 'status',
        EXT_REF_ID: 'id',
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

const mockOrder = createClient().execute().body.results[0];
const orderDetails =  
  validParams.messages
  .filter(addErrorHandling(filterSalesOrderDetailsMessages))
  .map(addErrorHandling(parseSalesOrderDetailsMessage))

describe('consumeSalesOrderDetailsMessageCT', () => {
  it('Returns an error if given params are invalid', async () => {
    const invalidParams = {};
    return expect((await consumeSalesOrderDetailsMessageCT(invalidParams)).error).toBeTruthy();
  });

  it('returns success result if given valid params and a valid message', async () => {
    const response = await consumeSalesOrderDetailsMessageCT(validParams);
    expect(response).toEqual({
      batchSuccessCount: 1,
      messagesCount: 1,
      ok: true,
      shouldResolveOffsets: 1
    });
  });

  it('returns success result if given valid params and a valid message; batch messages if same order number same line numbers', async () => {
    const response = await consumeSalesOrderDetailsMessageCT({ ...validParams, messages: [{ ...validParams.messages[0] },{ ...validParams.messages[0] }] });
    expect(response).toEqual({
      batchSuccessCount: 1,
      messagesCount: 2,
      ok: true,
      shouldResolveOffsets: 1
    });
  });

  it('returns failed result if given valid params and a valid message but one line item doesn\'t exist; batch messages if same order number different line numbers', async () => {
    const batchParams = { ...validParams, messages: [{ ...validParams.messages[0] },{ ...validParams.messages[0], value: { ...validParams.messages[0].value, EXT_REF_ID: 'id-other' } }] }
    return expect((await consumeSalesOrderDetailsMessageCT(batchParams)).error).toBeTruthy();
  });

  it('returns success result if given valid params and a valid message; don\'t batch messages if different order number same line numbers', async () => {
    const response = await consumeSalesOrderDetailsMessageCT({ ...validParams, messages: [{ ...validParams.messages[0] },{ ...validParams.messages[0], value: { ...validParams.messages[0].value, ORDER_NUMBER: '11111' } }] });
    expect(response).toEqual({
      batchSuccessCount: 2,
      messagesCount: 2,
      ok: true,
      shouldResolveOffsets: 1
    });
  });

  it('returns failed result if given valid params and a valid message but one line item doesn\'t exist; don\'t batch messages if different order number different line numbers', async () => {
    const batchParams = { ...validParams, messages: [{ ...validParams.messages[0] },{ ...validParams.messages[0], value: { ...validParams.messages[0].value, ORDER_NUMBER: '11111', EXT_REF_ID: 'id-other' } }] }
    return expect((await consumeSalesOrderDetailsMessageCT(batchParams)).error).toBeTruthy();
  });
});

describe('getActionsFromOrderDetail', () => {
  it('returns an array', () => {
    expect(Array.isArray(getActionsFromOrderDetail(orderDetails[0], mockOrder.lineItems[0]))).toBe(true);
  });

  it('returns the correct CT update actions', () => {
    const expectedActions = [
      {
        action: 'setLineItemCustomField',
        lineItemId: 'id',
        name: 'orderDetailLastModifiedDate',
        value: new Date(1000000000000)
      },
      {
        action: 'transitionLineItemState',
        lineItemId: 'id',
        quantity: 1,
        fromState: { id: 'stateId' }, 
        toState: { key: undefined },
        force: true
      },
    ];
    const actualActions = getActionsFromOrderDetail(orderDetails[0], mockOrder.lineItems[0]);

    expect(actualActions.length).toBe(expectedActions.length);
    expect(actualActions[0]).toMatchObject(expectedActions[0]);
    expect(actualActions[1]).toMatchObject(expectedActions[1]);
  });
});

describe('formatOrderDetailBatchRequestBody', () => {
  it('returns a string', () => {
    expect(typeof formatOrderDetailBatchRequestBody(orderDetails, mockOrder, mockOrder.lineItems) === 'object').toBe(true);
  });

  it('returns the correct body to update a line item status', () => {
    const expectedBody = {"body":'{"version":1,"actions":[{"action":"setLineItemCustomField","lineItemId":"id","name":"orderDetailLastModifiedDate","value":"2001-09-09T01:46:40.000Z"},{"action":"transitionLineItemState","lineItemId":"id","quantity":1,"fromState":{"id":"stateId"},"toState":{},"force":true}]}', "error":null}
    const actualBody = formatOrderDetailBatchRequestBody(orderDetails, mockOrder, mockOrder.lineItems);
    expect(actualBody).toEqual(expectedBody);
  });
});

describe('existingCtOrderDetailIsNewer', () => {
  it('returns `false` if CT line item is newer than JESTA line item', () => {
    expect(existingCtOrderDetailIsNewer(mockOrder.lineItems[0], orderDetails[0])).toBe(false);
  });

  it('returns `true` if CT line item is newer than JESTA line item', () => {
    const oldOrderDetail = JSON.parse(JSON.stringify(orderDetails[0]));
    oldOrderDetail.orderDetailLastModifiedDate = new Date(0);
    expect(existingCtOrderDetailIsNewer(mockOrder.lineItems[0], oldOrderDetail)).toBe(true);
  });

  it('returns `false` if given CT line item lacks a last modified date', () => {
    const mockOrderDetailMissingDate = JSON.parse(JSON.stringify(mockOrder.lineItems[0]));
    delete mockOrderDetailMissingDate.custom.fields.orderDetailLastModifiedDate
    expect(existingCtOrderDetailIsNewer(mockOrderDetailMissingDate, orderDetails[0])).toBe(false);
  });

  it('throws an error if given JESTA line item lacks a last modified date', () => {
    const orderDetailMissingDate = JSON.parse(JSON.stringify(orderDetails[0]))
    delete orderDetailMissingDate.orderDetailLastModifiedDate
    expect(() => existingCtOrderDetailIsNewer(mockOrder.lineItems[0], orderDetailMissingDate)).toThrow("Cannot read property 'getTime' of undefined");
  });
});

describe('getCtOrderDetailFromCtOrder', () => {
  it('returns the matching line item if one exists', () => {
    expect(getCtOrderDetailFromCtOrder(orderDetails[0].id, mockOrder)).toMatchObject(mockOrder.lineItems[0]);
  });

  it('returns `undefined` if no matching line item exists', () => {
    expect(getCtOrderDetailFromCtOrder('some-line-id-not-found', mockOrder)).toBeUndefined();
  });
});

describe('groupByOrderNumber', () => {
  const orderDetail1 = orderDetails[0];
  const orderDetail2 = JSON.parse(JSON.stringify(orderDetail1));
  orderDetail2.id = 'id2';
  const orderDetail3 = JSON.parse(JSON.stringify(orderDetail1));
  orderDetail3.id = 'id3';
  orderDetail3.orderNumber = 6555;

  it('returns correctly grouped line items when some have matching order numbers', () => {
    const orderDetailsSomeWithMatchingOrderNumbers = [orderDetail1, orderDetail2, orderDetail3];
    const groupOne = [orderDetail1, orderDetail2]
    groupOne.originalIndexes = [0,1]
    const groupTwo = [orderDetail3]
    groupTwo.originalIndexes = [2]
    const expected = [groupOne, groupTwo];
    expect(groupByOrderNumber(orderDetailsSomeWithMatchingOrderNumbers)).toEqual(expected);
  });

  it('returns correctly grouped line items when none have matching order numbers', () => {
    const orderDetailsAllWithDifferentOrderNumbers = [orderDetail1, orderDetail3];
    const groupOne = [orderDetail1]
    groupOne.originalIndexes = [0]
    const groupTwo = [orderDetail3]
    groupTwo.originalIndexes = [1]
    const expected = [groupOne, groupTwo];
    expect(groupByOrderNumber(orderDetailsAllWithDifferentOrderNumbers)).toEqual(expected);
  });

  it('returns correctly grouped line items when given a single line item', () => {
    const singleOrderDetails = [orderDetail1];
    const groupOne = [orderDetail1]
    groupOne.originalIndexes = [0]
    const expected = [groupOne];
    expect(groupByOrderNumber(singleOrderDetails)).toEqual(expected);
  });

  it('returns an empty array if given an empty array', () => {
    expect(groupByOrderNumber([])).toEqual([]);
  });
});

describe('getCtOrderDetailsFromCtOrder', () => {
  it('returns an empty array if no matching line items exist on the order', () => {
    const orderDetailsNotInOrder = JSON.parse(JSON.stringify(orderDetails));
    orderDetailsNotInOrder[0].id = 'id-not-in-order';
    expect(getCtOrderDetailsFromCtOrder(orderDetailsNotInOrder, mockOrder)).toEqual([]);
  });

  it('returns an array of matching line items when some exist on the order', () => {
    expect(getCtOrderDetailsFromCtOrder(orderDetails, mockOrder)).toEqual(mockOrder.lineItems);
  });
});

describe('getOutOfDateOrderDetailIds', () => {
  const mockOrderMultiLine = JSON.parse(JSON.stringify(mockOrder));
  mockOrderMultiLine.lineItems.push(JSON.parse(JSON.stringify(mockOrderMultiLine.lineItems[0])));
  mockOrderMultiLine.lineItems[1].id = 'id2';
  mockOrderMultiLine.lineItems.push(JSON.parse(JSON.stringify(mockOrderMultiLine.lineItems[0])));
  mockOrderMultiLine.lineItems[2].id = 'id3';

  const outOfDateOrderDetails1 = JSON.parse(JSON.stringify(orderDetails[0]));
  outOfDateOrderDetails1.orderDetailLastModifiedDate = new Date(0);
  const outOfDateOrderDetails2 = JSON.parse(JSON.stringify(orderDetails[0]));
  outOfDateOrderDetails2.orderDetailLastModifiedDate = new Date(0);
  outOfDateOrderDetails2.id = 'id2';
  const outOfDateOrderDetails3 = JSON.parse(JSON.stringify(orderDetails[0]));
  outOfDateOrderDetails3.orderDetailLastModifiedDate = new Date(0);
  outOfDateOrderDetails3.id = 'id3';

  const upToDateOrderDetails1 = JSON.parse(JSON.stringify(orderDetails));
  upToDateOrderDetails1.orderDetailLastModifiedDate = new Date(upToDateOrderDetails1.orderDetailLastModifiedDate);
  const upToDateOrderDetails2 = JSON.parse(JSON.stringify(orderDetails[0]));
  upToDateOrderDetails2.orderDetailLastModifiedDate = new Date(upToDateOrderDetails2.orderDetailLastModifiedDate);
  upToDateOrderDetails2.id = 'id2';
  const upToDateOrderDetails3 = JSON.parse(JSON.stringify(orderDetails[0]));
  upToDateOrderDetails3.orderDetailLastModifiedDate = new Date(upToDateOrderDetails3.orderDetailLastModifiedDate);
  upToDateOrderDetails3.id = 'id3';

  it('returns an array with the out of date line items', () => {
    expect(getOutOfDateOrderDetailIds(mockOrderMultiLine.lineItems, [outOfDateOrderDetails1, upToDateOrderDetails2, outOfDateOrderDetails3])).toEqual(['id', 'id3']);
    expect(getOutOfDateOrderDetailIds(mockOrderMultiLine.lineItems, [outOfDateOrderDetails1, outOfDateOrderDetails2, upToDateOrderDetails3])).toEqual(['id', 'id2']);
    expect(getOutOfDateOrderDetailIds(mockOrderMultiLine.lineItems, [upToDateOrderDetails1, outOfDateOrderDetails2, upToDateOrderDetails3])).toEqual(['id2']);
  });

  it('returns an empty array when there are no out of date line items', () => {
    expect(getOutOfDateOrderDetailIds(mockOrderMultiLine.lineItems, ['id', 'id2', 'id3'])).toEqual([]);
  });
});

describe('getActionsFromOrderDetailss', () => {
  const missingLineError = new Error('Order line id does not exist')
  const mockOrderMultiLine = JSON.parse(JSON.stringify(mockOrder));
  mockOrderMultiLine.lineItems.push(JSON.parse(JSON.stringify(mockOrderMultiLine.lineItems[0])));
  mockOrderMultiLine.lineItems[1].id = 'id2';
  mockOrderMultiLine.lineItems.push(JSON.parse(JSON.stringify(mockOrderMultiLine.lineItems[0])));
  mockOrderMultiLine.lineItems[2].id = 'id3';

  const orderDetail1 = JSON.parse(JSON.stringify(orderDetails[0]));
  const orderDetail2 = JSON.parse(JSON.stringify(orderDetails[0]));
  orderDetail2.orderStatus = 'CANCELED';
  orderDetail2.id = 'id2';
  const orderDetail3 = JSON.parse(JSON.stringify(orderDetails[0]));
  orderDetail3.orderStatus = 'OPEN';
  orderDetail3.id = 'id3';
  const orderDetail4 = JSON.parse(JSON.stringify(orderDetails[0]));
  orderDetail4.orderstatus = 'SHIPPED';
  orderDetail4.id = 'id4';

  it('returns the right actions when given a batch of different line items all in the order', () => {
    const orderDetailsTest = [orderDetail1, orderDetail2, orderDetail3];
    const expected = {"actions":[{"action": "setLineItemCustomField", "lineItemId": "id", "name": "orderDetailLastModifiedDate", "value": "2001-09-09T01:46:40.000Z"}, {"action": "transitionLineItemState", "force": true, "fromState": {"id": "stateId"}, "lineItemId": "id", "quantity": 1, "toState": {"key": undefined}}, {"action": "setLineItemCustomField", "lineItemId": "id2", "name": "orderDetailLastModifiedDate", "value": "2001-09-09T01:46:40.000Z"}, {"action": "transitionLineItemState", "force": true, "fromState": {"id": "stateId"}, "lineItemId": "id2", "quantity": 1, "toState": {"key": undefined }}, {"action": "setLineItemCustomField", "lineItemId": "id3", "name": "orderDetailLastModifiedDate", "value": "2001-09-09T01:46:40.000Z"}, {"action": "transitionLineItemState", "force": true, "fromState": {"id": "stateId"}, "lineItemId": "id3", "quantity": 1, "toState": {"key": "openLineItemStatus" }}], orderDetailUpdateError: null}
    expect(getActionsFromOrderDetails(orderDetailsTest, mockOrderMultiLine.lineItems)).toEqual(expected);
  });

  it('returns the right actions when given both existing and line items not existing on the order', () => {
    const orderDetailsTest = [orderDetail1, orderDetail2, orderDetail3, orderDetail4];
    const expected = {"actions":[{"action": "setLineItemCustomField", "lineItemId": "id", "name": "orderDetailLastModifiedDate", "value": "2001-09-09T01:46:40.000Z"}, {"action": "transitionLineItemState", "force": true, "fromState": {"id": "stateId"}, "lineItemId": "id", "quantity": 1, "toState": {"key": undefined}}, {"action": "setLineItemCustomField", "lineItemId": "id2", "name": "orderDetailLastModifiedDate", "value": "2001-09-09T01:46:40.000Z"}, {"action": "transitionLineItemState", "force": true, "fromState": {"id": "stateId"}, "lineItemId": "id2", "quantity": 1, "toState": {"key": undefined }}, {"action": "setLineItemCustomField", "lineItemId": "id3", "name": "orderDetailLastModifiedDate", "value": "2001-09-09T01:46:40.000Z"}, {"action": "transitionLineItemState", "force": true, "fromState": {"id": "stateId"}, "lineItemId": "id3", "quantity": 1, "toState": {"key": "openLineItemStatus"}}], orderDetailUpdateError: missingLineError}
    expect(getActionsFromOrderDetails(orderDetailsTest, mockOrderMultiLine.lineItems)).toEqual(expected);
  });

  it('returns an empty array when given an empty array of line items', () => {
    expect(getActionsFromOrderDetails([], [])).toEqual({ actions:[], orderDetailUpdateError: null });
    expect(getActionsFromOrderDetails([], mockOrderMultiLine.lineItems)).toEqual({ actions:[], orderDetailUpdateError: null });
  });
});

describe('getMostUpToDateOrderDetails', () => {
  it('returns the most up to date line item when given an array of line items', () => {
    const oldOrderDetail = JSON.parse(JSON.stringify(orderDetails[0]));
    oldOrderDetail.orderDetailLastModifiedDate = new Date(10);

    const oldestOrderDetail = JSON.parse(JSON.stringify(orderDetails[0]));
    oldestOrderDetail.orderDetailLastModifiedDate = new Date(0);

    const newestOrderDetail = JSON.parse(JSON.stringify(orderDetails[0]));
    newestOrderDetail.orderDetailLastModifiedDate = new Date(newestOrderDetail.orderDetailLastModifiedDate);

    const orderDetailsTest = [oldOrderDetail, newestOrderDetail, oldestOrderDetail];

    expect(getMostUpToDateOrderDetail(orderDetailsTest)).toEqual(newestOrderDetail);
    expect(getMostUpToDateOrderDetail([oldOrderDetail])).toEqual(oldOrderDetail);
  });

  it('returns `undefined` when given an empty array', () => {
    expect(getMostUpToDateOrderDetail([])).toBeNull();
  });
});

describe('removeDuplicateOrderDetails', () => {
  const orderDetail1 = JSON.parse(JSON.stringify(orderDetails[0]));
  orderDetail1.orderDetailLastModifiedDate = new Date(0);
  const orderDetail1Duplicate1 = JSON.parse(JSON.stringify(orderDetails[0]));
  orderDetail1Duplicate1.orderDetailLastModifiedDate = new Date(50);
  const orderDetail1Duplicate2 = JSON.parse(JSON.stringify(orderDetails[0]));
  orderDetail1Duplicate2.orderDetailLastModifiedDate = new Date(100);

  const orderDetail2 = JSON.parse(JSON.stringify(orderDetails[0]));
  orderDetail2.orderDetailLastModifiedDate = new Date(0);
  orderDetail2.id = 'id2';

  const orderDetail3 = JSON.parse(JSON.stringify(orderDetails[0]));
  orderDetail3.orderDetailLastModifiedDate = new Date(0);
  orderDetail3.id = 'id3';

  it('returns an array matching the given array when there are no duplicate line items', () => {
    const orderDetailsWithNoDuplicates = [orderDetail1, orderDetail2, orderDetail3];
    expect(removeDuplicateOrderDetails(orderDetailsWithNoDuplicates)).toEqual(orderDetailsWithNoDuplicates);
  });

  it('returns an array with oldest duplicate line items removed when given an array that contains duplicate line items', () => {
    const orderDetailsWithDuplicates = [orderDetail1, orderDetail1Duplicate1, orderDetail1Duplicate2, orderDetail2, orderDetail3];
    expect(removeDuplicateOrderDetails(orderDetailsWithDuplicates)).toEqual([orderDetail1Duplicate2, orderDetail2, orderDetail3]);
  });
});
