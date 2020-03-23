const { getActionsFromSku, formatSkuRequestBody, existingCtSkuIsNewer } = require('../../utils');
const consumeSkuMessageCT = require('..');

jest.mock('@commercetools/sdk-client');
jest.mock('@commercetools/api-request-builder');
jest.mock('@commercetools/sdk-middleware-auth');
jest.mock('@commercetools/sdk-middleware-http');
jest.mock('node-fetch');

const validParams = {
  topicName: 'skus-connect-jdbc',
  messages: [{
      topic: 'skus-connect-jdbc',
      value: {
        ID:'skuId',
        STYLEID:'styleId',
        COLORID:'colorId',
        SIZEID: 'sizeId',
        SIZE: 'size',
        DIMENSION: 'dimension',
        LASTMODIFIEDDATE:1000000000,
        FKORGANIZATIONNO: '1'
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

describe('consumeSkuMessageCT', () => {
  it('throws an error if given params are invalid', () => {
    const invalidParams = {};
    return expect(consumeSkuMessageCT(invalidParams)).rejects.toThrow();
  });

  xit('returns `undefined` if given valid params', async () => {
    const response = await consumeSkuMessageCT(validParams);
    expect(response).toBeUndefined();
  });
});

describe('getActionsFromSku', () => {
  const sku = { id: 'sku-01', styleId: '1', colorId: 'c1', sizeId: 's1'};

  it('returns an array', () => {
    expect(Array.isArray(getActionsFromSku(sku))).toBe(true);
  });

  it('returns the correct CT update actions', () => {
    const expectedActions = [
      {
        action: 'setAttribute',
        sku: 'sku-01',
        name: 'colorId',
        value: 'c1'
      },
      {
        action: 'setAttribute',
        sku: 'sku-01',
        name: 'sizeId',
        value: 's1'
      },
    ];
    const actualActions = getActionsFromSku(sku);

    expect(actualActions.length).toBe(expectedActions.length);
    expect(actualActions[0]).toMatchObject(expectedActions[0]);
    expect(actualActions[1]).toMatchObject(expectedActions[1]);
  });

  it('ignores attributes that are not defined on SKUs in CT', () => {
    const skuWithInvalidAttribute = { 'foo': 'bar' };
    const actualActions = getActionsFromSku(skuWithInvalidAttribute);
    expect(actualActions.length).toBe(0);
  });
});

describe('formatSkuRequestBody', () => {
  const sku = { id: 'sku-01', styleId: '1', colorId: 'c1', sizeId: 's1' };

  it('returns a string', () => {
    expect(typeof formatSkuRequestBody(sku, 1, true) === 'string').toBe(true);
  });

  it('returns the correct body to create a new SKU', () => {
    const expectedBody = '{"version":1,"actions":[{"action":"addVariant","sku":"sku-01"},{"action":"setAttribute","sku":"sku-01","name":"colorId","value":"c1"},{"action":"setAttribute","sku":"sku-01","name":"sizeId","value":"s1"}]}';
    const actualBody = formatSkuRequestBody(sku, 1, true);
    expect(actualBody).toBe(expectedBody);
  });

  it('returns the correct body to update an existing a SKU', () => {
    const expectedBody = '{"version":2,"actions":[{"action":"setAttribute","sku":"sku-01","name":"colorId","value":"c1"},{"action":"setAttribute","sku":"sku-01","name":"sizeId","value":"s1"}]}';
    const actualBody = formatSkuRequestBody(sku, 2, false);
    expect(actualBody).toBe(expectedBody);
  });
});

describe('existingCtSkuIsNewer', () => {
  const olderCtSku = { sku: 'sku-01', attributes: [{ name: 'skuLastModifiedInternal', value: new Date(0) }] };
  const newerCtSku = { sku: 'sku-01',  attributes: [{ name: 'skuLastModifiedInternal', value: new Date(100) }] };
  const jestaSku = { id: 'sku-01', styleId: '1', skuLastModifiedInternal: new Date(50) };

  it('returns `true` if CT SKU is newer than JESTA SKU', () => {
    expect(existingCtSkuIsNewer(newerCtSku, jestaSku)).toBe(true);
  });

  it('returns `false` if CT SKU is older than JESTA SKU', () => {
    expect(existingCtSkuIsNewer(olderCtSku, jestaSku)).toBe(false);
  });

  it('throws an error if given CT SKU lacks a last modified date', () => {
    const ctSkuWithMissingDate = { sku: 'sku-01', attributes: [] };
    expect(() => existingCtSkuIsNewer(ctSkuWithMissingDate, jestaSku)).toThrow('CT SKU sku-01 lacks attribute \'skuLastModifiedInternal\'');
  });

  it('throws an error if given JESTA SKU lacks a last modified date', () => {
    const jestaSkuWithMissingDate = { id: 'sku-01', styleId: '1' };
    expect(() => existingCtSkuIsNewer(olderCtSku, jestaSkuWithMissingDate)).toThrow('JESTA SKU lacks last modified date');
  });
});
