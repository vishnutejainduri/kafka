const consumeShipmentDetailsMessageCT = require('..');
const {
  filterShipmentDetailsMessages,
  parseShipmentDetailsMessage
} = require('../../../lib/parseShipmentDetailsMessage');
const {
  addErrorHandling,
} = require('../../../product-consumers/utils');
const {
  mergeCustomObjectDetails
} = require('../../orderUtils');
const {
  shipmentAttributeNames
} = require('../../constantsCt');

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
        QTY_SHIPPED: 1,
        EXT_REF_ID: 'extRefId',
        MODIFIED_DATE: 1000000000000,
        CREATED_DATE: 1000000000000,
        SHIPPED_DATE: 1000000000000,
        SHIPMENT_MODIFIED_DATE: 1000000000000,
        SHIPMENT_CREATED_DATE: 1000000000000,
        ORDER_CREATED_DATE: 1000000000000,
        LANGUAGE_NO: 1,
        DESC_ENG: 'descEng',
        DESC_FR: 'descFr',
        SKU: 'sku',
        DEST_SITE_ID: 'destSiteId',
        SERVICE_TYPE: 'serviceType',
        FROM_STORE_NAME: 'fromStoreName',
        FROM_ADDRESS_1: 'fromAddress1',
        FROM_ADDRESS_2: 'fromAddress2',
        FROM_CITY: 'fromCity',
        FROM_STATE_ID: 'fromStateId',
        FROM_ZIP_CODE: 'fromZipCode',
        FILL_SITE_ID: 'fillSiteId',
        FROM_COUNTRY_ID: 'fromCountryId',
        FROM_HOME_PHONE: 'fromHomePhone',
        FIRST_NAME: 'firstName',
        LAST_NAME: 'lastName',
        ADDRESS_1: 'address1',
        ADDRESS_2: 'address2',
        CITY: 'city',
        STATE_ID: 'stateId',
        ZIP_CODE: 'zipCode',
        COUNTRY_ID: 'countryId',
        HOME_PHONE: 'homePhone'
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
    return expect((await consumeShipmentDetailsMessageCT(invalidParams)).errorResult).toBeTruthy();
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

describe('mergeCustomObjectDetails', () => {
  it('no existing shipment detail or new shipment details so returns null', () => {
    const existingShipmentDetails = []
    const newShipmentDetails = []
    expect(mergeCustomObjectDetails(existingShipmentDetails, newShipmentDetails, 'shipmentDetailId', shipmentAttributeNames.SHIPMENT_DETAILS_LAST_MODIFIED_DATE)).toEqual(null)
  });
  it('1 existing shipment detail and no new shipment details so returns null', () => {
    const existingShipmentDetails = [{ ...shipmentDetails[0] }]
    const newShipmentDetails = []
    expect(mergeCustomObjectDetails(existingShipmentDetails, newShipmentDetails, 'shipmentDetailId', shipmentAttributeNames.SHIPMENT_DETAILS_LAST_MODIFIED_DATE)).toEqual(null)
  });
  it('1 existing shipment detail and 1 new shipment details so returns both shipment details', () => {
    const existingShipmentDetails = [{ ...shipmentDetails[0] }];
    const newShipmentDetails = [{ ...shipmentDetails[0], shipmentDetailId: '1234-POS-2-1' }];
    expect(mergeCustomObjectDetails(existingShipmentDetails, newShipmentDetails, 'shipmentDetailId', shipmentAttributeNames.SHIPMENT_DETAILS_LAST_MODIFIED_DATE)).toEqual([{"businessUnitId": "1", "carrierId": "carrierId", "line": "1", "lineItemId": "extRefId", "orderNumber": "orderNumber", "quantityShipped": 1, "shipmentDetailId": "1234-POS-1-1", "shipmentDetailLastModifiedDate": new Date("2001-09-09T01:46:40.000Z"), "shipmentId": "1234", "siteId": "POS", "status": "status", "trackingNumber": "trackingNumber"}, {"businessUnitId": "1", "carrierId": "carrierId", "line": "1", "lineItemId": "extRefId", "orderNumber": "orderNumber", "quantityShipped": 1, "shipmentDetailId": "1234-POS-2-1", "shipmentDetailLastModifiedDate": new Date('2001-09-09T01:46:40.000Z'), "shipmentId": "1234", "siteId": "POS", "status": "status", "trackingNumber": "trackingNumber"}])
  });
  it('1 existing shipment detail and 1 new shipment detail that has the same id so returns just the latest shipment detail', () => {
    const existingShipmentDetails = [{ ...shipmentDetails[0] }];
    const newShipmentDetails = [{ ...shipmentDetails[0] }];
    expect(mergeCustomObjectDetails(existingShipmentDetails, newShipmentDetails, 'shipmentDetailId', shipmentAttributeNames.SHIPMENT_DETAILS_LAST_MODIFIED_DATE)).toEqual([{"businessUnitId": "1", "carrierId": "carrierId", "line": "1", "lineItemId": "extRefId", "orderNumber": "orderNumber", "quantityShipped": 1, "shipmentDetailId": "1234-POS-1-1", "shipmentDetailLastModifiedDate": new Date('2001-09-09T01:46:40.000Z'), "shipmentId": "1234", "siteId": "POS", "status": "status", "trackingNumber": "trackingNumber"}])
  });
  it('1 existing shipment detail and 1 new shipment detail that has the same id but is more up to date so returns the latest shipment detail', () => {
    const existingShipmentDetails = [{ ...shipmentDetails[0] }];
    const newShipmentDetails = [{ ...shipmentDetails[0], shipmentDetailLastModifiedDate: new Date('2001-09-10T01:46:40.000Z') }];
    expect(mergeCustomObjectDetails(existingShipmentDetails, newShipmentDetails, 'shipmentDetailId', shipmentAttributeNames.SHIPMENT_DETAILS_LAST_MODIFIED_DATE)).toEqual([{"businessUnitId": "1", "carrierId": "carrierId", "line": "1", "lineItemId": "extRefId", "orderNumber": "orderNumber", "quantityShipped": 1, "shipmentDetailId": "1234-POS-1-1", "shipmentDetailLastModifiedDate": new Date('2001-09-10T01:46:40.000Z'), "shipmentId": "1234", "siteId": "POS", "status": "status", "trackingNumber": "trackingNumber"}])
  });
  it('no existing shipment detail and 1 new shipment detail so returns the new shipment detail', () => {
    const existingShipmentDetails = [];
    const newShipmentDetails = [{ ...shipmentDetails[0] }];
    expect(mergeCustomObjectDetails(existingShipmentDetails, newShipmentDetails, 'shipmentDetailId', shipmentAttributeNames.SHIPMENT_DETAILS_LAST_MODIFIED_DATE)).toEqual([{"businessUnitId": "1", "carrierId": "carrierId", "line": "1", "lineItemId": "extRefId", "orderNumber": "orderNumber", "quantityShipped": 1, "shipmentDetailId": "1234-POS-1-1", "shipmentDetailLastModifiedDate": new Date('2001-09-09T01:46:40.000Z'), "shipmentId": "1234", "siteId": "POS", "status": "status", "trackingNumber": "trackingNumber"}])
  });
  it('1 existing shipment detail and 1 new shipment detail that has the same id but is out of date so returns null for no update', () => {
    const existingShipmentDetails = [{ ...shipmentDetails[0] }];
    const newShipmentDetails = [{ ...shipmentDetails[0], shipmentDetailLastModifiedDate: new Date('2001-09-08T01:46:40.000Z') }];
    expect(mergeCustomObjectDetails(existingShipmentDetails, newShipmentDetails, 'shipmentDetailId', shipmentAttributeNames.SHIPMENT_DETAILS_LAST_MODIFIED_DATE)).toEqual(null)
  });
  it('0 existing shipment details and 2 new shipment details that have the same id but one is more recent so should only insert most recent', () => {
    const existingShipmentDetails = [];
    const newShipmentDetails = [{ ...shipmentDetails[0], status: 'shipped', shipmentDetailLastModifiedDate: new Date('2001-09-08T01:46:50.000Z') }, { ...shipmentDetails[0], status: 'in picking', shipmentDetailLastModifiedDate: new Date('2001-09-08T01:46:40.000Z') }];
    expect(mergeCustomObjectDetails(existingShipmentDetails, newShipmentDetails, 'shipmentDetailId', shipmentAttributeNames.SHIPMENT_DETAILS_LAST_MODIFIED_DATE)).toEqual([{"businessUnitId": "1", "carrierId": "carrierId", "line": "1", "lineItemId": "extRefId", "orderNumber": "orderNumber", "quantityShipped": 1, "shipmentDetailId": "1234-POS-1-1", "shipmentDetailLastModifiedDate": new Date('2001-09-08T01:46:50.000Z'), "shipmentId": "1234", "siteId": "POS", "status": "shipped", "trackingNumber": "trackingNumber"}])
  });
});
