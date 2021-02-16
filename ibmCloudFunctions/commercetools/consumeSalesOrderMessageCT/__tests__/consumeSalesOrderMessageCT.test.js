const consumeSalesOrderMessageCT = require('..');
const { updateOrderStatus } = require('../../orderUtils');
const { filterSalesOrderMessages, parseSalesOrderMessage } = require('../../../lib/parseSalesOrderMessage');
const getCtHelpers = require('../../../lib/commercetoolsSdk');
const {
  addErrorHandling,
} = require('../../../product-consumers/utils');

jest.mock('@commercetools/sdk-client');
jest.mock('@commercetools/api-request-builder');
jest.mock('@commercetools/sdk-middleware-auth');
jest.mock('@commercetools/sdk-middleware-http');
jest.mock('node-fetch');

const validParams = {
  topicName: 'sales-orders-connect-jdbc',
  messages: [{
      topic: 'sales-orders-connect-jdbc',
      value: {
        ORDER_NUMBER: '67897',
        STATUS: 'status',
        EXT_REF_ID: 'id',
        LINE: 1,
        QTY_CANCELLED: 1.0,
        MODIFIED_DATE: 1000000000000,
        CREATED_DATE: 1000000000000,
        ORDER_STATUS: 'orderStatus',
        ORDER_CREATED_DATE: 1000000000000,
        LANGUAGE_NO: 1,
        ORDER_MODIFIED_DATE: 1000000000000,
        GIFT_WRAP_IND: 'N',
        STYLEID: 'styleId',
        DESC_ENG: 'descEng',
        DESC_FR: 'descFr',
        CATEGORY_LEVEL_2A_EN: 'categoryL3',
        EA_IND: 'N',
        BRAND_NAME_ENG: 'brandNameEng',
        RETURNABLE_IND: 'Y',
        SIZE: 'size',
        QTY_ORDERED: 1.0,
        SKU: 'sku',
        UNIT_PRICE: 100.00,
        EXTENSION_AMOUNT: 100.00,
        TRANSACTION_TOTAL: 100.00,
        EXPDATE: '0000',
        TAX_TOTAL: 100.00,
        SHIPPING_CHARGES_TOTAL: 100.00,
        EMAIL_ADDRESS: 'emailAddress',
        FIRST_NAME: 'firstName',
        LAST_NAME: 'lastName',
        ADDRESS_1: 'address1',
        ADDRESS_2: 'address2',
        CITY: 'city',
        STATE_ID: 'stateId',
        ZIP_CODE: 'zipCode',
        COUNTRY_ID: 'countryId',
        HOME_PHONE: 'homePhone',
        LRUID: 'lrUid',
        SHIPPING_TAX1: 1.0,
        SHIPPING_TAX2: 2.0,
        REASON_CODE: 'reasonCode'
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

const mockedCtHelpers = getCtHelpers(validParams);

describe('consumeSalesOrderMessageCT', () => {
  it('Returns an error if given params are invalid', async () => {
    const invalidParams = {};
    return expect((await consumeSalesOrderMessageCT(invalidParams)).errorResult).toBeTruthy();
  });

  it('returns success result if given valid params and a valid message', async () => {
    const response = await consumeSalesOrderMessageCT(validParams);
    expect(response).toEqual({
      batchSuccessCount: 1,
      messagesCount: 1,
      ok: true,
      shouldResolveOffsets: 1
    });
  });

  it('returns success result if given valid params and a valid message; should batch updates for the same order number', async () => {
    const response = await consumeSalesOrderMessageCT({ ...validParams, messages: [{ ...validParams.messages[0] }, { ...validParams.messages[0] }] });
    expect(response).toEqual({
      batchSuccessCount: 1,
      messagesCount: 2,
      ok: true,
      shouldResolveOffsets: 1
    });
  });

  it('returns success result if given valid params and a valid message; should not batch updates for different order numbers', async () => {
    const response = await consumeSalesOrderMessageCT({ ...validParams, messages: [{ ...validParams.messages[0] }, { ...validParams.messages[0], value: { ...validParams.messages[0].value, ORDER_NUMBER: '11111' } }] });
    expect(response).toEqual({
      batchSuccessCount: 2,
      messagesCount: 2,
      ok: true,
      shouldResolveOffsets: 1
    });
  });
});

describe('parseSalesOrderMessageCt', () => {
  it('correct message', () => {
    const response = parseSalesOrderMessage(validParams.messages[0]);
    expect(response).toEqual({ orderNumber: '67897', orderStatus: 'orderStatus', orderLastModifiedDate: new Date(validParams.messages[0].value.ORDER_MODIFIED_DATE)  });
  });
});

describe('updateOrderStatus', () => {
  it('date in the future; should produce update message for CT', async () => {
     const result =  
        validParams.messages
        .filter(addErrorHandling(filterSalesOrderMessages))
        .map(addErrorHandling(parseSalesOrderMessage))
    const response = await updateOrderStatus(mockedCtHelpers, result[0]);
    expect(response).toBeTruthy();
  });
});

// empty tests documenting possible flows/cases
describe('testStubs; documenting test cases', () => {
  it('if can\'t find orderNumber fail the code, to generate notification in platform', () => {});
  it('if lastmodifieddate is in the past do nothing', () => {});
  it('if lastmodifieddate is in the future perform a corresponding status update in CT', () => {});
  it('if inbound status is CANCELLED update CT order status to CANCELLED', () => {});
  it('if inbound status is OPEN update CT order status to OPEN', () => {});
  it('if inbound status is HOLD update CT order status to HOLD', () => {});
  it('if inbound status is SHIPPED update CT order status to SHIPPED', () => {});
  it('if inbound status is IN PICKING update CT order status to IN PICKING', () => {});
  it('if inbound status is unmappable to a CT status, fail the code, to generate notification in platform', () => {});
});
