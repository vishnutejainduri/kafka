const consumeFacetsMessageCT = require('..');
const { updateStyleFacets } = require('../utils');
const { parseFacetMessageCt, filterFacetMessageCt } = require('../../../lib/parseFacetMessageCt');
const getCtHelpers = require('../../../lib/commercetoolsSdk');
const {
  addErrorHandling,
} = require('../../../product-consumers/utils');
const { languageKeys } = require('../../../commercetools/constantsCt');

jest.mock('@commercetools/sdk-client');
jest.mock('@commercetools/api-request-builder');
jest.mock('@commercetools/sdk-middleware-auth');
jest.mock('@commercetools/sdk-middleware-http');
jest.mock('node-fetch');

const validParams = {
  topicName: 'facets-connect-jdbc-STYLE_ITEM_CHARACTERISTICS_ECA',
  messages: [{
      topic: 'facets-connect-jdbc-STYLE_ITEM_CHARACTERISTICS_ECA',
      value: {
        'STYLEID': 'styleId',
        'CATEGORY': 'category',
        'DESC_ENG': 'descEng',
        'DESC_FR': 'descFr',
        'UPD_FLG': 'updFlg',
        'FKORGANIZATIONNO': '1',
        'CHAR_TY_SUB_TYPE': null,
        'CHARACTERISTIC_TYPE_ID': '15',
        'CHARACTERISTIC_VALUE_ID': null
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

describe('consumeFacetsMessageCT', () => {
  it('throws an error if given params are invalid', async () => {
    const invalidParams = {};
    return expect((await consumeFacetsMessageCT(invalidParams)).error).toBeTruthy()
  });

  it('returns success result if given valid params and a valid message', async () => {
    const response = await consumeFacetsMessageCT(validParams);
    expect(response).toEqual({ errors: [], failureIndexes: [], successCount: 1 });
  });
});

describe('parseFacetMessageCt', () => {
  it('correct message; promo sticker', () => {
    const response = parseFacetMessageCt(validParams.messages[0]);
    expect(response).toEqual({ _id: 'styleId', id: 'styleId', promotionalSticker: { 'en-CA': 'descEng', 'fr-CA': 'descFr' } });
  });

  it('should return a null result if the facet is marked for deletion', () => {
    const validDeletionMessage = {
      topic: 'facets-connect-jdbc-STYLE_ITEM_CHARACTERISTICS_ECA',
      value: {
        'STYLEID': 'styleId',
        'CATEGORY': 'category',
        'DESC_ENG': 'descEng',
        'DESC_FR': 'descFr',
        'UPD_FLG': 'F',
        'FKORGANIZATIONNO': '1',
        'CHAR_TY_SUB_TYPE': null,
        'CHARACTERISTIC_TYPE_ID': '15',
        'CHARACTERISTIC_VALUE_ID': null
      }
    };

    const actual = parseFacetMessageCt(validDeletionMessage);

    expect(actual).toEqual({
      _id: 'styleId',
      id: 'styleId',
      promotionalSticker: {
        [languageKeys.ENGLISH]: '',
        [languageKeys.FRENCH]: ''
      }
    });
  });
});

describe('updateStyleFacets', () => {
  it('correct message; promo stickers', async () => {
     const result =
        validParams.messages
        .filter(addErrorHandling(filterFacetMessageCt))
        .map(addErrorHandling(parseFacetMessageCt))
    const response = await updateStyleFacets(mockedCtHelpers, validParams.productTypeId, result[0]);
    expect(response).toBeTruthy();
  });
});
