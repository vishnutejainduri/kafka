const consumeStylesBasicMessageCT = require('..');
const { updateStyleOutlet } = require('../utils');
const { parseStyleBasicMessageCt } = require('../../../lib/parseStyleBasicMessageCt');
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
  topicName: 'styles-basic-connect-jdbc',
  messages: [{
      topic: 'styles-basic-connect-jdbc',
      value: {
        LAST_MODIFIED_DATE: 1000000000000,
        STYLE_ID: 'styleId',
        BRAND_ID: '1'
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

const mockedCtHelpers = getCtHelpers(validParams);

describe('consumeStylesBasicMessageCT', () => {
  it('throws an error if given params are invalid', async () => {
    const invalidParams = {};
    return expect((await consumeStylesBasicMessageCT(invalidParams)).error).toBeTruthy();
  });

  it('returns success result if given valid params and a valid message', async () => {
    const response = await consumeStylesBasicMessageCT(validParams);
    expect(response).toEqual({ errors: [], failureIndexes: [], successCount: 1 });
  });
});

describe('parseStyleBasicMessageCt', () => {
  it('correct message', () => {
    const response = parseStyleBasicMessageCt(validParams.messages[0]);
    expect(response.styleOutletLastModifiedInternal instanceof Date).toBe(true);
  });
});

describe('updateStyleOutlet', () => {
  it('correct message; date in the future', async () => {
     const result =  
        validParams.messages
        .map(addErrorHandling(parseStyleBasicMessageCt))
    const response = await updateStyleOutlet(mockedCtHelpers, validParams.productTypeId, result[0]);
    expect(response).toBeTruthy();
  });
});
