const consumeStylesBasicMessageCT = require('..');
const { updateStyleOutlet } = require('../utils');
const { filterStyleBasicMessage } = require('../../../lib/parseStyleBasicMessage');
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
        BRAND_ID: 'brandId'
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
  it('throws an error if given params are invalid', () => {
    const invalidParams = {};
    return expect(consumeStylesBasicMessageCT(invalidParams)).rejects.toThrow();
  });

  it('returns `undefined` if given valid params', async () => {
    const response = await consumeStylesBasicMessageCT(validParams);
    expect(response).toBeUndefined();
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
        .filter(addErrorHandling(filterStyleBasicMessage))
        .map(addErrorHandling(parseStyleBasicMessageCt))
    const response = await updateStyleOutlet(mockedCtHelpers, validParams.productTypeId, result[0]);
    console.log('response', JSON.stringify(response));
    expect(response).toBeTruthy();
  });
});
