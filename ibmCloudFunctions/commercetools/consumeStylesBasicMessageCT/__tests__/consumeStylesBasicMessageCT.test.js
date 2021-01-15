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
  it('Returns an error if given params are invalid', async () => {
    const invalidParams = {};
    return expect((await consumeStylesBasicMessageCT(invalidParams)).errorResult).toBeTruthy();
  });

  it('returns success result if given valid params and a valid message', async () => {
    const response = await consumeStylesBasicMessageCT(validParams);
    expect(response).toEqual({
      batchSuccessCount: 1,
      messagesCount: 1,
      ok: true,
      shouldResolveOffsets: 1
    });
  });

  it('returns success result if given valid params and batches two valid messages with same id', async () => {
    const validBatch = { ...validParams, messages: [validParams.messages[0], validParams.messages[0]] }
    const response = await consumeStylesBasicMessageCT(validBatch);
    expect(response).toEqual({
      batchSuccessCount: 1,
      messagesCount: 2,
      ok: true,
      shouldResolveOffsets: 1
    });
  });

  it('returns success result if given valid params and doesn\'t batch two valid messages with different id', async () => {
    const validBatch = { ...validParams, messages: [validParams.messages[0], { ...validParams.messages[0], value: { ...validParams.messages[0].value, STYLE_ID: 'styleId2' } } ] }
    const response = await consumeStylesBasicMessageCT(validBatch);
    expect(response).toEqual({
      batchSuccessCount: 2,
      messagesCount: 2,
      ok: true,
      shouldResolveOffsets: 1
    });
  });
});

describe('parseStyleBasicMessageCt', () => {
  it('correct message', () => {
    const response = parseStyleBasicMessageCt(validParams.messages[0]);
    expect(response.styleOutletLastModifiedInternal instanceof Date).toBe(true);
  });

  it('returns a message with `isOutlet` set to false when given a message that lacks a brand ID', () => {
    const messageWithNoBrandId = { ...validParams.messages[0], value: { ...validParams.messages[0].value, BRAND_ID: null } };
    const parsedMessage = parseStyleBasicMessageCt(messageWithNoBrandId);
    expect(parsedMessage.isOutlet).toBe(false);
  });

  it('returns a message with `isOutlet` set to true when given a message has a brand ID of 2 or 3', () => {
    const messageWithBrandId2 = { ...validParams.messages[0], value: { ...validParams.messages[0].value, BRAND_ID: 2 } };
    const messageWithBrandId3 = { ...validParams.messages[0],  value: { ...validParams.messages[0].value, BRAND_ID: 3 } };
    const parsedMessageWithBrandId2 = parseStyleBasicMessageCt(messageWithBrandId2);
    const parsedMessageWithBrandId3 = parseStyleBasicMessageCt(messageWithBrandId3);

    expect(parsedMessageWithBrandId2.isOutlet).toBe(true);
    expect(parsedMessageWithBrandId3.isOutlet).toBe(true);
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
