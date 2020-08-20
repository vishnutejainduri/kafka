const consumeFacetsMessageCT = require('..');
const { updateStyleFacets, createOrUpdateCategoriesFromFacet } = require('../utils');
const { getExistingCtStyle } = require('../../styleUtils');
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
        'CHARACTERISTIC_VALUE_ID': null,
        'LAST_MODIFIED': 1000000000000
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

const validMicrositeParams = { ...validParams, messages: [{
    topic: 'facets-connect-jdbc-STYLE_ITEM_CHARACTERISTICS_ECA',
    value: {
      'STYLEID': 'styleId',
      'CATEGORY': 'category',
      'DESC_ENG': 'microsite_en',
      'DESC_FR': 'microsite_fr',
      'UPD_FLG': 'T',
      'FKORGANIZATIONNO': '1',
      'CHAR_TY_SUB_TYPE': null,
      'CHARACTERISTIC_TYPE_ID': 'DPM01',
      'CHARACTERISTIC_VALUE_ID': '57',
      'LAST_MODIFIED': 1000000000000
    }
  }]
};

const mockedCtHelpers = getCtHelpers(validParams);

describe('consumeFacetsMessageCT', () => {
  it('Returns an error if given params are invalid', async () => {
    const invalidParams = {};
    return expect((await consumeFacetsMessageCT(invalidParams)).error).toBeTruthy()
  });

  it('returns success result if given valid params and a valid message', async () => {
    const response = await consumeFacetsMessageCT(validParams);
    expect(response).toEqual({ batchSuccessCount:1, messagesCount:1, ok:true });
  });

  it('returns success result if given valid params and batches two valid messages', async () => {
    const validBatchParams = { ...validParams, messages: [{ ...validParams.messages[0] }, { ...validParams.messages[0] }] }
    const response = await consumeFacetsMessageCT(validBatchParams);
    expect(response).toEqual({ batchSuccessCount:1, messagesCount:2, ok:true });
  });

  it('returns success result if given valid params and doesn\'t batch two valid messages', async () => {
    const validBatchParams = { ...validParams, messages: [{ ...validParams.messages[0] }, { ...validParams.messages[0], value: { ...validParams.messages[0].value, STYLEID: 'styleId2' } } ] }
    const response = await consumeFacetsMessageCT(validBatchParams);
    expect(response).toEqual({ batchSuccessCount:2, messagesCount:2, ok:true });
  });
});

describe('parseFacetMessageCt', () => {
  const expectedMicrositeResult = {
    _id: 'styleId',
    facetId: 'facetid_57',
    id: 'styleId',
    isMarkedForDeletion: false,
    lastModified: new Date(1000000000000),
    microsite: { [languageKeys.ENGLISH]: 'microsite_en', [languageKeys.FRENCH]: 'microsite_fr' }
  }
  const expectedPromoStickerResult = {
    _id: 'styleId',
    facetId: 'facetid_null',
    id: 'styleId',
    isMarkedForDeletion: false,
    lastModified: new Date(1000000000000),
    promotionalSticker: { [languageKeys.ENGLISH]: 'descEng', [languageKeys.FRENCH]: 'descFr' }
  }

  it('correct message; promo sticker', () => {
    const response = parseFacetMessageCt(validParams.messages[0]);
    expect(response).toEqual(expectedPromoStickerResult);
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
        'CHARACTERISTIC_VALUE_ID': null,
        'LAST_MODIFIED': 1000000000000
      }
    };

    const actual = parseFacetMessageCt(validDeletionMessage);
    expect(actual).toEqual({ ...expectedPromoStickerResult, isMarkedForDeletion: true, promotionalSticker: { [languageKeys.ENGLISH]: '', [languageKeys.FRENCH]: '' } })
  });

  it('correct message; microsite', () => {
    const response = parseFacetMessageCt(validMicrositeParams.messages[0]);
    expect(response).toEqual(expectedMicrositeResult);
  });

  it('should return a valid result if the facet is marked for deletion; only isMarkedForDeletion should be changed to true', () => {
    const validMicrositeDeletionMessage = {
      topic: 'facets-connect-jdbc-STYLE_ITEM_CHARACTERISTICS_ECA',
      value: {
        'STYLEID': 'styleId',
        'CATEGORY': 'category',
        'DESC_ENG': 'microsite_en',
        'DESC_FR': 'microsite_fr',
        'UPD_FLG': 'F',
        'FKORGANIZATIONNO': '1',
        'CHAR_TY_SUB_TYPE': null,
        'CHARACTERISTIC_TYPE_ID': 'DPM01',
        'CHARACTERISTIC_VALUE_ID': '57',
        'LAST_MODIFIED': 1000000000000
      }
    };

    const actual = parseFacetMessageCt(validMicrositeDeletionMessage);
    expect(actual).toEqual({ ...expectedMicrositeResult, isMarkedForDeletion: true })
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

  it('correct message; microsite', async () => {
     const result =
        validMicrositeParams.messages
        .filter(addErrorHandling(filterFacetMessageCt))
        .map(addErrorHandling(parseFacetMessageCt))
    const response = await updateStyleFacets(mockedCtHelpers, validParams.productTypeId, result[0]);
    expect(response).toBeTruthy();
  });
});

describe('createOrUpdateCategoriesFromFacet', () => {
  it('new facet not a microsite; don\'t affect cateogires return null', async () => {
     const result =
        validParams.messages
        .filter(addErrorHandling(filterFacetMessageCt))
        .map(addErrorHandling(parseFacetMessageCt))
    const existingCtStyle = await getExistingCtStyle(result[0].id, mockedCtHelpers);
    const response = await createOrUpdateCategoriesFromFacet(result[0], existingCtStyle, mockedCtHelpers);
    expect(response).toEqual(null);
  });
  it('new microsite; return message with existing microsite categories and newly created category', async () => {
    const validNewMicrositeMessage = {
      topic: validMicrositeParams.messages[0].topic,
      value: {
        ...validMicrositeParams.messages[0].value,
        DESC_ENG: 'updated_microsite_en',
        DESC_FR: 'updated_microsite_fr',
        CHARACTERISTIC_VALUE_ID: '58'
      }
    };
    const result = parseFacetMessageCt(validNewMicrositeMessage);
    const existingCtStyle = await getExistingCtStyle(result.id, mockedCtHelpers);
    const response = await createOrUpdateCategoriesFromFacet(result, existingCtStyle, mockedCtHelpers);
    expect(response).toEqual([{"ancestors": [], "assets": [], "createdAt": "2020-04-20T19:57:34.586Z", "createdBy": {"clientId": "9YnDCNDg16EER7mWlMjXeHkF", "isPlatformClient": false}, "id": "8f1b6d78-c29d-46cf-88fe-5bd935e49fd9", "key": "facetid_58", "lastMessageSequenceNumber": 1, "lastModifiedAt": "2020-04-20T19:57:34.586Z", "lastModifiedBy": {"clientId": "9YnDCNDg16EER7mWlMjXeHkF", "isPlatformClient": false}, "name": {"en-CA": "updated_microsite_en", "fr-CA": "updated_microsite_fr"}, "orderHint": "0.00001587412654585211010057", "slug": {"en-CA": "DPMROOTCATEGORY", "fr-CA": "DPMROOTCATEGORY"}, "version": 1}, {"id": "5bb79326-16ea-40f5-8857-31a020800a1c", "typeId": "category"}, {"id": "1ea2fe42-d3fb-4329-a3f2-da6208814aeb", "typeId": "category"}]);
  });
  it('existing microsite; return message to updated microsite category', async () => {
    const validNewMicrositeMessage = {
      topic: validMicrositeParams.messages[0].topic,
      value: {
        ...validMicrositeParams.messages[0].value,
        DESC_ENG: 'updated_microsite_en',
        DESC_FR: 'updated_microsite_fr'
      }
    };
    const result = parseFacetMessageCt(validNewMicrositeMessage);
    const existingCtStyle = await getExistingCtStyle(result.id, mockedCtHelpers);
    const response = await createOrUpdateCategoriesFromFacet(result, existingCtStyle, mockedCtHelpers);
    expect(response).toEqual([{"ancestors": [], "assets": [], "createdAt": "2020-04-20T19:57:34.586Z", "createdBy": {"clientId": "9YnDCNDg16EER7mWlMjXeHkF", "isPlatformClient": false}, "id": "8f1b6d78-c29d-46cf-88fe-5bd935e49fd9", "key": "facetid_57", "lastMessageSequenceNumber": 1, "lastModifiedAt": "2020-04-20T19:57:34.586Z", "lastModifiedBy": {"clientId": "9YnDCNDg16EER7mWlMjXeHkF", "isPlatformClient": false}, "name": {"en-CA": "updated_microsite_en", "fr-CA": "updated_microsite_fr"}, "orderHint": "0.00001587412654585211010057", "slug": {"en-CA": "DPMROOTCATEGORY", "fr-CA": "DPMROOTCATEGORY"}, "version": 1}, {"id": "5bb79326-16ea-40f5-8857-31a020800a1c", "typeId": "category"}, {"id": "1ea2fe42-d3fb-4329-a3f2-da6208814aeb", "typeId": "category"}]);
  });
  it('existing microsite; return message with no update as nothing has changed for the microsite', async () => {
    const validNewMicrositeMessage = validMicrositeParams.messages[0];
    const result = parseFacetMessageCt(validNewMicrositeMessage);
    const existingCtStyle = await getExistingCtStyle(result.id, mockedCtHelpers);
    const response = await createOrUpdateCategoriesFromFacet(result, existingCtStyle, mockedCtHelpers);
    expect(response).toEqual([{"ancestors": [], "assets": [], "createdAt": "2020-04-20T19:57:34.586Z", "createdBy": {"clientId": "9YnDCNDg16EER7mWlMjXeHkF", "isPlatformClient": false}, "id": "1ea2fe42-d3fb-4329-a3f2-da6208814aeb", "key": "facetid_57", "lastMessageSequenceNumber": 1, "lastModifiedAt": "2020-04-20T19:57:34.586Z", "lastModifiedBy": {"clientId": "9YnDCNDg16EER7mWlMjXeHkF", "isPlatformClient": false}, "name": {"en-CA": "microsite_en", "fr-CA": "microsite_fr"}, "orderHint": "0.00001587412654585211010057", "slug": {"en-CA": "DPMROOTCATEGORY", "fr-CA": "DPMROOTCATEGORY"}, "version": 1}, {"id": "5bb79326-16ea-40f5-8857-31a020800a1c", "typeId": "category"}, {"id": "1ea2fe42-d3fb-4329-a3f2-da6208814aeb", "typeId": "category"}]);
  });
  it('microsite flagged for deletion; return only categories that aren\'t to be deleted', async () => {
    const validNewMicrositeMessage = {
      topic: validMicrositeParams.messages[0].topic,
      value: {
        ...validMicrositeParams.messages[0].value,
        UPD_FLG: 'F'
      }
    };
    const result = parseFacetMessageCt(validNewMicrositeMessage);
    const existingCtStyle = await getExistingCtStyle(result.id, mockedCtHelpers);
    const response = await createOrUpdateCategoriesFromFacet(result, existingCtStyle, mockedCtHelpers);
    expect(response).toEqual([{"id": "5bb79326-16ea-40f5-8857-31a020800a1c", "typeId": "category"}]);
  });
});
