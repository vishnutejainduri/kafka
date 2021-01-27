const consumeShipmentMessageCT = require('..');
const { filterShipmentMessages, parseShipmentMessage } = require('../../../lib/parseShipmentMessage');
const {
  addErrorHandling,
} = require('../../../product-consumers/utils');
const {
  getShipmentsOrderUpdateActions
} = require('../../orderUtils');
const { createClient } = require('@commercetools/sdk-client');

jest.mock('@commercetools/sdk-client');
jest.mock('@commercetools/api-request-builder');
jest.mock('@commercetools/sdk-middleware-auth');
jest.mock('@commercetools/sdk-middleware-http');
jest.mock('node-fetch');

const validParams = {
  topicName: 'shipments-connect-jdbc',
  messages: [{
      topic: 'shipments-connect-jdbc',
      value: {
        ORDER_NUMBER: 'orderNumber',
        SHIPMENT_ID: 1234,
        SITE_ID: 'POS',
        LINE: 1,
        BUSINESS_UNIT_ID: 1,
        STATUS: 'status',
        TRACKING_NUMBER: 'trackingNumber',
        CARRIER_ID: 'carrierId',
        QTY_SHIPPED: 1,
        EXT_REF_ID: 'extRefId',
        MODIFIED_DATE: 1000000000000,
        CREATED_DATE: 1000000000000,
        SHIPMENT_MODIFIED_DATE: 1000000000000,
        SHIPMENT_CREATED_DATE: 1000000000000,
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

const mockOrder = createClient().execute().body.results[0];
const shipments =  
  validParams.messages
  .filter(addErrorHandling(filterShipmentMessages))
  .map(addErrorHandling(parseShipmentMessage))

describe('consumeShipmentMessageCT', () => {
  it('Returns an error if given params are invalid', async () => {
    const invalidParams = {};
    return expect((await consumeShipmentMessageCT(invalidParams)).errorResult).toBeTruthy();
  });

  it('returns success result if given valid params and a valid message', async () => {
    const response = await consumeShipmentMessageCT(validParams);
    expect(response).toEqual({
      batchSuccessCount: 1,
      messagesCount: 1,
      ok: true,
      shouldResolveOffsets: 1
    });
  });

  it('returns success result if given valid params and a valid message; batch messages if same order number', async () => {
    const response = await consumeShipmentMessageCT({ ...validParams, messages: [{ ...validParams.messages[0] },{ ...validParams.messages[0] }] });
    expect(response).toEqual({
      batchSuccessCount: 1,
      messagesCount: 2,
      ok: true,
      shouldResolveOffsets: 1
    });
  });

  it('returns success result if given valid params and a valid message; don\'t batch messages if different order number', async () => {
    const response = await consumeShipmentMessageCT({ ...validParams, messages: [{ ...validParams.messages[0] },{ ...validParams.messages[0], value: { ...validParams.messages[0].value, ORDER_NUMBER: '11111' } }] });
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
    const result = parseShipmentMessage(validParams.messages[0])
    const expectedResult = {
        orderNumber: 'orderNumber',
        shipmentId: '1234',
        serviceType: 'serviceType',
        destinationSiteId: 'destSiteId',
        shipmentLastModifiedDate: new Date(validParams.messages[0].value.MODIFIED_DATE)
    }
    expect(result).toEqual(expectedResult);
  });
});

describe('getShipmentsOrderUpdateActions', () => {
  it('returns an array', () => {
    expect(Array.isArray(getShipmentsOrderUpdateActions(shipments, mockOrder))).toBe(true);
  });

  it('returns the correct CT update actions', () => {
    const expectedActions = [
      {
        action: 'setCustomField',
        name: 'shipments',
        value: [{ id: undefined, typeId: 'key-value-document' }]
      }
    ];
    const actualActions = getShipmentsOrderUpdateActions(shipments, mockOrder);

    expect(actualActions.length).toBe(expectedActions.length);
    expect(actualActions[0]).toMatchObject(expectedActions[0]);
  });
});
