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
        SALES_ORDER_ID: 67897,
        STATUS: 'status',
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

const mockedCtHelpers = getCtHelpers(validParams);

describe('consumeSalesOrderMessageCT', () => {
  it('throws an error if given params are invalid', () => {
    const invalidParams = {};
    return expect(consumeSalesOrderMessageCT(invalidParams)).rejects.toThrow();
  });

  it('returns `undefined` if given valid params', async () => {
    const response = await consumeSalesOrderMessageCT(validParams);
    expect(response).toBeUndefined();
  });
});

describe('parseSalesOrderMessageCt', () => {
  it('correct message', () => {
    const response = parseSalesOrderMessage(validParams.messages[0]);
    expect(response).toEqual({ orderNumber: 67897, orderStatus: 'status', orderLastModifiedDate: new Date(validParams.messages[0].value.MODIFIED_DATE)  });
  });
});

describe('updateOrderStatus', () => {
  it('correct message; date in the future', async () => {
     const result =  
        validParams.messages
        .filter(addErrorHandling(filterSalesOrderMessages))
        .map(addErrorHandling(parseSalesOrderMessage))
    const response = await updateOrderStatus(mockedCtHelpers, result[0]);
    expect(response).toBeTruthy();
  });
});
