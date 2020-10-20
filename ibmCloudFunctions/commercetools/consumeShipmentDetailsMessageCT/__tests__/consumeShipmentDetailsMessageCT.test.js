const consumeShipmentDetailsMessageCT = require('..');
const {
  filterShipmentDetailsMessages,
  parseShipmentDetailsMessage
} = require('../../../lib/parseShipmentDetailsMessage');
const {
  addErrorHandling,
} = require('../../../product-consumers/utils');
const {
  mergeShipmentDetails
} = require('../../orderUtils');
//const { createClient } = require('@commercetools/sdk-client');

jest.mock('@commercetools/sdk-client');
jest.mock('@commercetools/api-request-builder');
jest.mock('@commercetools/sdk-middleware-auth');
jest.mock('@commercetools/sdk-middleware-http');
jest.mock('node-fetch');

const validParams = {
  topicName: 'shipment-details-connect-jdbc',
  messages: [{
      topic: 'shipment-details-connect-jdbc',
      value: {
        SHIPMENT_ID: 1234,
        SITE_ID: 'POS',
        LINE: 1,
        BUSINESS_UNIT_ID: 1,
        STATUS: 'status',
        ORDER_NUMBER: 'orderNumber',
        TRACKING_NUMBER: 'trackingNumber',
        CARRIER_ID: 'carrierId',
        QTY_SHIPPED: 1.0,
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

const shipmentDetails =  
  validParams.messages
  .filter(addErrorHandling(filterShipmentDetailsMessages))
  .map(addErrorHandling(parseShipmentDetailsMessage))

describe('consumeShipmentDetailsMessageCT', () => {
  it('Returns an error if given params are invalid', async () => {
    const invalidParams = {};
    return expect((await consumeShipmentDetailsMessageCT(invalidParams)).error).toBeTruthy();
  });

  it('returns success result if given valid params and a valid message', async () => {
    const response = await consumeShipmentDetailsMessageCT(validParams);
    expect(response).toEqual({
      batchSuccessCount: 1,
      messagesCount: 1,
      ok: true,
      shouldResolveOffsets: 1
    });
  });

  it('returns success result if given valid params and a valid message; batch messages if same order number', async () => {
    const response = await consumeShipmentDetailsMessageCT({ ...validParams, messages: [{ ...validParams.messages[0] },{ ...validParams.messages[0] }] });
    expect(response).toEqual({
      batchSuccessCount: 1,
      messagesCount: 2,
      ok: true,
      shouldResolveOffsets: 1
    });
  });

  it('returns success result if given valid params and a valid message; don\'t batch messages if different order number', async () => {
    const response = await consumeShipmentDetailsMessageCT({ ...validParams, messages: [{ ...validParams.messages[0] },{ ...validParams.messages[0], value: { ...validParams.messages[0].value, ORDER_NUMBER: '11111' } }] });
    expect(response).toEqual({
      batchSuccessCount: 2,
      messagesCount: 2,
      ok: true,
      shouldResolveOffsets: 1
    });
  });
});

describe('parseShipmentMessage', () => {
  it('returns a message with correctly formatted fields', () => {
    const result = parseShipmentDetailsMessage(validParams.messages[0])
    const expectedResult = {
        shipmentId: '1234',
        siteId: 'POS',
        line: '1',
        businessUnitId: '1',
        status: 'status',
        trackingNumber: 'trackingNumber',
        carrierId: 'carrierId',
        quantityShipped: 1.0,
        lineItemId: 'extRefId',
        orderNumber: 'orderNumber',
        shipmentDetailLastModifiedDate: new Date(validParams.messages[0].value.MODIFIED_DATE),
        shipmentDetailId: '1234-POS-1-1'
    }
    expect(result).toEqual(expectedResult);
  });
});

describe('mergeShipmentDetails', () => {
  it('no existing shipment detail or new shipment details so returns null', () => {
    const existingShipmentDetails = []
    const newShipmentDetails = []
    expect(mergeShipmentDetails(existingShipmentDetails, newShipmentDetails)).toEqual(null)
  });
  it('1 existing shipment detail and no new shipment details so returns null', () => {
    const existingShipmentDetails = [{ ...shipmentDetails[0] }]
    const newShipmentDetails = []
    expect(mergeShipmentDetails(existingShipmentDetails, newShipmentDetails)).toEqual(null)
  });
  it('1 existing shipment detail and 1 new shipment details so returns both shipment details', () => {
    const existingShipmentDetails = [{ ...shipmentDetails[0] }];
    const newShipmentDetails = [{ ...shipmentDetails[0], shipmentDetailId: '1234-POS-2-1' }];
    expect(mergeShipmentDetails(existingShipmentDetails, newShipmentDetails)).toEqual([{"businessUnitId": "1", "carrierId": "carrierId", "line": "1", "lineItemId": "extRefId", "orderNumber": "orderNumber", "quantityShipped": 1, "shipmentDetailId": "1234-POS-1-1", "shipmentDetailLastModifiedDate": new Date("2001-09-09T01:46:40.000Z"), "shipmentId": "1234", "siteId": "POS", "status": "status", "trackingNumber": "trackingNumber"}, {"businessUnitId": "1", "carrierId": "carrierId", "line": "1", "lineItemId": "extRefId", "orderNumber": "orderNumber", "quantityShipped": 1, "shipmentDetailId": "1234-POS-2-1", "shipmentDetailLastModifiedDate": new Date('2001-09-09T01:46:40.000Z'), "shipmentId": "1234", "siteId": "POS", "status": "status", "trackingNumber": "trackingNumber"}])
  });
  it('1 existing shipment detail and 1 new shipment detail that has the same id so returns just the latest shipment detail', () => {
    const existingShipmentDetails = [{ ...shipmentDetails[0] }];
    const newShipmentDetails = [{ ...shipmentDetails[0] }];
    expect(mergeShipmentDetails(existingShipmentDetails, newShipmentDetails)).toEqual([{"businessUnitId": "1", "carrierId": "carrierId", "line": "1", "lineItemId": "extRefId", "orderNumber": "orderNumber", "quantityShipped": 1, "shipmentDetailId": "1234-POS-1-1", "shipmentDetailLastModifiedDate": new Date('2001-09-09T01:46:40.000Z'), "shipmentId": "1234", "siteId": "POS", "status": "status", "trackingNumber": "trackingNumber"}])
  });
  it('1 existing shipment detail and 1 new shipment detail that has the same id but is more up to date so returns the latest shipment detail', () => {
    const existingShipmentDetails = [{ ...shipmentDetails[0] }];
    const newShipmentDetails = [{ ...shipmentDetails[0], shipmentDetailLastModifiedDate: new Date('2001-09-10T01:46:40.000Z') }];
    expect(mergeShipmentDetails(existingShipmentDetails, newShipmentDetails)).toEqual([{"businessUnitId": "1", "carrierId": "carrierId", "line": "1", "lineItemId": "extRefId", "orderNumber": "orderNumber", "quantityShipped": 1, "shipmentDetailId": "1234-POS-1-1", "shipmentDetailLastModifiedDate": new Date('2001-09-10T01:46:40.000Z'), "shipmentId": "1234", "siteId": "POS", "status": "status", "trackingNumber": "trackingNumber"}])
  });
  it('no existing shipment detail and 1 new shipment detail so returns the new shipment detail', () => {
    const existingShipmentDetails = [];
    const newShipmentDetails = [{ ...shipmentDetails[0] }];
    expect(mergeShipmentDetails(existingShipmentDetails, newShipmentDetails)).toEqual([{"businessUnitId": "1", "carrierId": "carrierId", "line": "1", "lineItemId": "extRefId", "orderNumber": "orderNumber", "quantityShipped": 1, "shipmentDetailId": "1234-POS-1-1", "shipmentDetailLastModifiedDate": new Date('2001-09-09T01:46:40.000Z'), "shipmentId": "1234", "siteId": "POS", "status": "status", "trackingNumber": "trackingNumber"}])
  });
  it('1 existing shipment detail and 1 new shipment detail that has the same id but is out of date so returns null for no update', () => {
    const existingShipmentDetails = [{ ...shipmentDetails[0] }];
    const newShipmentDetails = [{ ...shipmentDetails[0], shipmentDetailLastModifiedDate: new Date('2001-09-08T01:46:40.000Z') }];
    expect(mergeShipmentDetails(existingShipmentDetails, newShipmentDetails)).toEqual(null)
  });
});
