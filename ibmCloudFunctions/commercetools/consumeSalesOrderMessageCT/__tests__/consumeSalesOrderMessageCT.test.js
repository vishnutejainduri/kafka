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
  it('Returns an error if given params are invalid', async () => {
    const invalidParams = {};
    return expect((await consumeSalesOrderMessageCT(invalidParams)).error).toBeTruthy();
  });

  it('returns success result if given valid params and a valid message', async () => {
    const response = await consumeSalesOrderMessageCT(validParams);
    expect(response).toEqual({ errors: [], failureIndexes: [], successCount: 1, shouldResolveOffsets: 1 });
  });
});

describe('parseSalesOrderMessageCt', () => {
  it('correct message', () => {
    const response = parseSalesOrderMessage(validParams.messages[0]);
    expect(response).toEqual({ orderNumber: 67897, orderStatus: 'status', orderLastModifiedDate: new Date(validParams.messages[0].value.MODIFIED_DATE)  });
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
  it('if inbound status is CANCELED update CT order status to Canceled', () => {});
  it('if inbound status is OPEN update CT order status to In Process', () => {});
  it('if inbound status is HOLD update CT order status to In Process', () => {});
  it('if inbound status is SHIPPED update CT order status to Shipped', () => {});
  it('if inbound status is unmappable to a CT status, fail the code, to generate notification in platform', () => {});
});
