const getCtHelpers = require('../../../lib/commercetoolsSdk');
const consumeCatalogueMessageCT = require('..');
const { parseStyleMessageCt, formatLanguageKeys } = require('../../../lib/parseStyleMessageCt');
const {
  createStyle,
  updateStyle,
  existingCtStyleIsNewer,
  getCtStyleAttributeValue
} = require('../../styleUtils');

jest.mock('@commercetools/sdk-client');
jest.mock('@commercetools/api-request-builder');
jest.mock('@commercetools/sdk-middleware-auth');
jest.mock('@commercetools/sdk-middleware-http');
jest.mock('node-fetch');

const validParams = {
  topicName: 'styles-connect-jdbc-CATALOG',
  ctpProjectKey: 'key',
  ctpClientId: 'id',
  ctpClientSecret: 'secret',
  ctpAuthUrl: 'authUrl',
  ctpApiUrl: 'apiUrl',
  ctpScopes: 'manage_products:harryrosen-dev',
  productTypeId: 'product-type-reference-id',
  messages: [{
      topic: 'styles-connect-jdbc-CATALOG',
      value: {
          STYLEID: '20000000',
          SUBDEPT: 'subDept',
          BRAND_NAME_ENG: 'brandNameEng',
          BRAND_NAME_FR: 'brandNameFr',
          DESC_ENG: 'descEng',
          DESC_FR: 'descFr',
          MARKET_DESC_ENG: 'marketDescEng',
          MARKET_DESC_ENG2: 'marketDescEng2',
          MARKET_DESC_FR: 'marketDescFr',
          MARKET_DESC_FR2: 'marketDescFr2',
          DETAIL_DESC3_ENG: 'detailDescEng',
          DETAIL_DESC3_FR: 'detailDescFr',
          FABRICANDMATERIAL_EN: 'fabricAndMaterialEn',
          FABRICANDMATERIAL_FR: 'fabricAndMaterialFr',
          SIZE_DESC_ENG: 'sizeDescEng',
          SIZE_DESC_FR: 'sizeDescFr',
          CAREINSTRUCTIONS_EN: 'careInstructionsEn',
          CAREINSTRUCTIONS_FR: 'careInstructionsFr',
          ADVICE_EN: 'adviceEn',
          ADVICE_FR: 'adviceFr',
          COLOUR_DESC_ENG: 'colourDescEng',
          COLOUR_DESC_FR: 'colourDescFr',
          CATAGORY: 'catagory',
          CATAGORY_LEVEL_1A: 'catagoryLevel1A',
          CATAGORY_LEVEL_2A: 'catagoryLevel2A',
          WEBSTATUS: 'webStatus',
          SEASON_CD: 'seasonCd',
          COLORID: 'colorId',
          UNIT_PRICE: 0.0,
          VSN: 'vsn',
          SUBCLASS: 341,
          UPD_TIMESTAMP: 1000000000000,
          EFFECTIVE_DATE: 1000000000000,
          TRUE_COLOURGROUP_EN: 'trueColourGroupEn',
          TRUE_COLOURGROUP_FR: 'trueColourGroupFr',
          LAST_MODIFIED_DATE: 1470391439001 // circa 2016
      }
  }]
};

const message = validParams.messages[0];

const ctStyleNewer = {
  "masterData": {
      "staged": {
          "masterVariant": {
              "attributes": [
                  {
                      "name": "styleLastModifiedInternal",
                      "value": "2020-03-18T16:53:20.823Z"
                  }
              ]
          }
      },
      "current": {
        "masterVariant": {
            "attributes": [
                {
                    "name": "styleLastModifiedInternal",
                    "value": "2019-03-18T16:53:20.823Z"
                }
            ]
        }
    }
    }
};

const ctStyleOlder = {
  "masterData": {
      "staged": {
          "masterVariant": {
              "attributes": [
                  {
                      "name": "styleLastModifiedInternal",
                      "value": "2015-03-18T16:53:20.823Z"
                  }
              ]
          }
      }
    }
};

const jestaStyle = parseStyleMessageCt(message);
const mockedCtHelpers = getCtHelpers(validParams);

describe('formatLanguageKeys', () => {
  const objectWithIncorrectlyFormattedKeys = {'en': 'foo', 'fr': 'bar'};
  const objectWithCorrectlyFormattedKeys = {'en-CA': 'foo', 'fr-CA': 'bar'};

  it('when given an object, returns an object that is the same expect its language keys are CT-style', () => {
    expect(formatLanguageKeys(objectWithIncorrectlyFormattedKeys)).toMatchObject(objectWithCorrectlyFormattedKeys);
  });

  it('correctly formats nested objects', () => {
    const nestedObjectWithIncorrectKeys = { foo: objectWithIncorrectlyFormattedKeys };
    const nestedObjectWithCorrectKeys = { foo: objectWithCorrectlyFormattedKeys };
    expect(formatLanguageKeys(nestedObjectWithIncorrectKeys)).toMatchObject(nestedObjectWithCorrectKeys);
  });

  it('when given a non-object, returns what it was given', () => {
    expect(formatLanguageKeys(1)).toBe(1);
    expect(formatLanguageKeys('foo')).toBe('foo');
  });
});

describe('getCtStyleAttributeValue', () => {
  it('returns the correct staged value for the given style', () => {
    const actual = getCtStyleAttributeValue(ctStyleNewer, 'styleLastModifiedInternal');
    const expected = '2020-03-18T16:53:20.823Z';
    expect(actual).toBe(expected);
  });

  it('returns the correct current value for the given style', () => {
    const actual = getCtStyleAttributeValue(ctStyleNewer, 'styleLastModifiedInternal', true);
    const expected = '2019-03-18T16:53:20.823Z';
    expect(actual).toBe(expected);
  });
});

describe('parseStyleMessageCt', () => {
  it('returns a message with correctly formatted localization keys', () => {
    const actualKeys = Object.keys(parseStyleMessageCt(message).brandName);
    const expectedKeys = ['en-CA', 'fr-CA'];
    expect(actualKeys).toEqual(expect.arrayContaining(expectedKeys));
  });

  it('does not return a message with `null` localization values', () => {
    const actualValue = parseStyleMessageCt(message).advice['en-CA'];
    expect(actualValue).not.toBe(null);
  });

  it('returns a message with a `styleLastModifiedInternal` date', () => {
    const actualValue = parseStyleMessageCt(message).styleLastModifiedInternal;
    expect(actualValue).toEqual(expect.any(Date));
  });
});

describe('existingCtStyleIsNewer', () => {
  it('returns true if existing CT style is newer than the given JESTA style', () => {
    expect(existingCtStyleIsNewer(ctStyleNewer, jestaStyle)).toBe(true);
  });

  it ('returns false if existing CT style is older than the given JESTA style', () => {
    expect(existingCtStyleIsNewer(ctStyleOlder, jestaStyle)).toBe(false);
  });

  it('returns false if JESTA style lacks a value for `styleLastModifiedInternal`', () => {
    const jestaStyleWithoutModifiedDate = {...jestaStyle, styleLastModifiedInternal: undefined };
    expect(existingCtStyleIsNewer(ctStyleOlder, jestaStyleWithoutModifiedDate)).toBe(false);
  });

  it('returns false if CT style lacks a value for `styleLastModifiedInternal`', () => {
    const ctStyleWithoutDate = {};
    expect(existingCtStyleIsNewer(ctStyleWithoutDate, jestaStyle)).toBe(false);
  });
});

describe('createStyle', () => {
  it('throws an error if the given style lacks an ID', () => {
    const styleWithNoId = {};
    return expect(createStyle(styleWithNoId, '1', mockedCtHelpers)).rejects.toThrow('Style lacks required key \'id\'');
  });
});

describe('updateStyle', () => {
  it('throws an error if the given style lacks an ID', () => {
    const styleWithNoId = {};
    return expect(updateStyle(styleWithNoId, '1', 'product-type-reference-id', mockedCtHelpers)).rejects.toThrow('Style lacks required key \'id\'');
  });

  it('throws an error if called without a version number', () => {
    const style = { id: '1' };
    return expect(updateStyle(style, undefined,'product-type-reference-id', mockedCtHelpers)).rejects.toThrow('Invalid arguments: must include \'version\'');
  });
});

describe('consumeCatalogueMessageCT', () => {
  it('throws an error if the given parameters are invalid', () => {
    const invalidParams = {};
    return expect(consumeCatalogueMessageCT(invalidParams)).rejects.toThrow();
  });

  it('returns `undefined` if given valid params', async () => {
    const response = await consumeCatalogueMessageCT(validParams);
    expect(response).toBeUndefined();
  });
});
