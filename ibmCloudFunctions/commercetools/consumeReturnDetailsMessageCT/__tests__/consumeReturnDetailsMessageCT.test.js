const consumeReturnDetailsMessageCT = require('..');
const {
  //filterReturnDetailsMessages,
  parseReturnDetailsMessage
} = require('../../../lib/parseReturnDetailsMessage');
/*const {
  addErrorHandling,
} = require('../../../product-consumers/utils');*/
/*const {
  mergeCustomObjectDetails
} = require('../../orderUtils');*/

jest.mock('@commercetools/sdk-client');
jest.mock('@commercetools/api-request-builder');
jest.mock('@commercetools/sdk-middleware-auth');
jest.mock('@commercetools/sdk-middleware-http');
jest.mock('node-fetch');

const validParams = {
  topicName: 'return-details-connect-jdbc',
  messages: [{
      topic: 'return-details-connect-jdbc',
      value: {
        RETURN_ID: 85,
        SITE_ID: 'POS',
        LINE: 1,
        BUSINESS_UNIT_ID: 1,
        SHIPMENT_ID: 1234,
        ORDER_NUMBER: 'orderNumber',
        QTY_RETURNED: 1.0,
        EXT_REF_ID: 'extRefId',
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

/*const returnDetails =  
  validParams.messages
  .filter(addErrorHandling(filterReturnDetailsMessages))
  .map(addErrorHandling(parseReturnDetailsMessage))*/

describe('consumeReturnDetailsMessageCT', () => {
  it('Returns an error if given params are invalid', async () => {
    const invalidParams = {};
    return expect((await consumeReturnDetailsMessageCT(invalidParams)).error).toBeTruthy();
  });

  it('returns success result if given valid params and a valid message', async () => {
    const response = await consumeReturnDetailsMessageCT(validParams);
    expect(response).toEqual({
      batchSuccessCount: 1,
      messagesCount: 1,
      ok: true,
      shouldResolveOffsets: 1
    });
  });

  it('returns success result if given valid params and a valid message; batch messages if same order number', async () => {
    const response = await consumeReturnDetailsMessageCT({ ...validParams, messages: [{ ...validParams.messages[0] },{ ...validParams.messages[0] }] });
    expect(response).toEqual({
      batchSuccessCount: 1,
      messagesCount: 2,
      ok: true,
      shouldResolveOffsets: 1
    });
  });

  it('returns success result if given valid params and a valid message; don\'t batch messages if different order number', async () => {
    const response = await consumeReturnDetailsMessageCT({ ...validParams, messages: [{ ...validParams.messages[0] },{ ...validParams.messages[0], value: { ...validParams.messages[0].value, ORDER_NUMBER: '11111' } }] });
    expect(response).toEqual({
      batchSuccessCount: 2,
      messagesCount: 2,
      ok: true,
      shouldResolveOffsets: 1
    });
  });
});

describe('parseReturnMessage', () => {
  it('returns a message with correctly formatted fields', () => {
    const result = parseReturnDetailsMessage(validParams.messages[0])
    const expectedResult = {
        siteId: 'POS',
        line: '1',
        businessUnitId: '1',
        quantityReturned: 1.0,
        returnDetailId: '85-POS-1-1',
        lineItemId: 'extRefId',
        orderNumber: 'orderNumber',
        shipmentId: '1234',
        returnDetailLastModifiedDate: new Date(validParams.messages[0].value.MODIFIED_DATE),
        returnId: '85' 
    }
    expect(result).toEqual(expectedResult);
  });
});

/*describe('mergeCustomObjectDetails', () => {
  it('no existing return detail or new return details so returns null', () => {
    const existingReturnDetails = []
    const newReturnDetails = []
    expect(mergeCustomObjectDetails(existingReturnDetails, newReturnDetails)).toEqual(null)
  });
  it('1 existing return detail and no new return details so returns null', () => {
    const existingReturnDetails = [{ ...returnDetails[0] }]
    const newReturnDetails = []
    expect(mergeCustomObjectDetails(existingReturnDetails, newReturnDetails)).toEqual(null)
  });
  it('1 existing return detail and 1 new return details so returns both return details', () => {
    const existingReturnDetails = [{ ...returnDetails[0] }];
    const newReturnDetails = [{ ...returnDetails[0], returnDetailId: '1234-POS-2-1' }];
    expect(mergeCustomObjectDetails(existingReturnDetails, newReturnDetails)).toEqual([{"businessUnitId": "1", "carrierId": "carrierId", "line": "1", "lineItemId": "extRefId", "orderNumber": "orderNumber", "quantityShipped": 1, "returnDetailId": "1234-POS-1-1", "returnDetailLastModifiedDate": new Date("2001-09-09T01:46:40.000Z"), "returnId": "1234", "siteId": "POS", "status": "status", "trackingNumber": "trackingNumber"}, {"businessUnitId": "1", "carrierId": "carrierId", "line": "1", "lineItemId": "extRefId", "orderNumber": "orderNumber", "quantityShipped": 1, "returnDetailId": "1234-POS-2-1", "returnDetailLastModifiedDate": new Date('2001-09-09T01:46:40.000Z'), "returnId": "1234", "siteId": "POS", "status": "status", "trackingNumber": "trackingNumber"}])
  });
  it('1 existing return detail and 1 new return detail that has the same id so returns just the latest return detail', () => {
    const existingReturnDetails = [{ ...returnDetails[0] }];
    const newReturnDetails = [{ ...returnDetails[0] }];
    expect(mergeCustomObjectDetails(existingReturnDetails, newReturnDetails)).toEqual([{"businessUnitId": "1", "carrierId": "carrierId", "line": "1", "lineItemId": "extRefId", "orderNumber": "orderNumber", "quantityShipped": 1, "returnDetailId": "1234-POS-1-1", "returnDetailLastModifiedDate": new Date('2001-09-09T01:46:40.000Z'), "returnId": "1234", "siteId": "POS", "status": "status", "trackingNumber": "trackingNumber"}])
  });
  it('1 existing return detail and 1 new return detail that has the same id but is more up to date so returns the latest return detail', () => {
    const existingReturnDetails = [{ ...returnDetails[0] }];
    const newReturnDetails = [{ ...returnDetails[0], returnDetailLastModifiedDate: new Date('2001-09-10T01:46:40.000Z') }];
    expect(mergeCustomObjectDetails(existingReturnDetails, newReturnDetails)).toEqual([{"businessUnitId": "1", "carrierId": "carrierId", "line": "1", "lineItemId": "extRefId", "orderNumber": "orderNumber", "quantityShipped": 1, "returnDetailId": "1234-POS-1-1", "returnDetailLastModifiedDate": new Date('2001-09-10T01:46:40.000Z'), "returnId": "1234", "siteId": "POS", "status": "status", "trackingNumber": "trackingNumber"}])
  });
  it('no existing return detail and 1 new return detail so returns the new return detail', () => {
    const existingReturnDetails = [];
    const newReturnDetails = [{ ...returnDetails[0] }];
    expect(mergeCustomObjectDetails(existingReturnDetails, newReturnDetails)).toEqual([{"businessUnitId": "1", "carrierId": "carrierId", "line": "1", "lineItemId": "extRefId", "orderNumber": "orderNumber", "quantityShipped": 1, "returnDetailId": "1234-POS-1-1", "returnDetailLastModifiedDate": new Date('2001-09-09T01:46:40.000Z'), "returnId": "1234", "siteId": "POS", "status": "status", "trackingNumber": "trackingNumber"}])
  });
  it('1 existing return detail and 1 new return detail that has the same id but is out of date so returns null for no update', () => {
    const existingReturnDetails = [{ ...returnDetails[0] }];
    const newReturnDetails = [{ ...returnDetails[0], returnDetailLastModifiedDate: new Date('2001-09-08T01:46:40.000Z') }];
    expect(mergeCustomObjectDetails(existingReturnDetails, newReturnDetails)).toEqual(null)
  });
});*/
