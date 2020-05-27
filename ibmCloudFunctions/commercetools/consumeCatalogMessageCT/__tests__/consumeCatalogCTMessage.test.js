const getCtHelpers = require('../../../lib/commercetoolsSdk');
const consumeCatalogueMessageCT = require('..');
const { parseStyleMessageCt, formatLanguageKeys } = require('../../../lib/parseStyleMessageCt');
const { filterStyleMessages } = require('../../../lib/parseStyleMessage');
const { addErrorHandling } = require('../../../product-consumers/utils');
const {
  createStyle,
  updateStyle,
  existingCtStyleIsNewer,
  getCtStyleAttributeValue,
  getCategory,
  getCategories,
  getUniqueCategoryIdsFromCategories,
  createCategory,
  categoryNameToKey,
  getActionsFromStyle
} = require('../../styleUtils');
const { styleAttributeNames, isStaged, entityStatus } = require('../../constantsCt');

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
          UNIT_PRICE: 1.0,
          VSN: 'vsn',
          SUBCLASS: 341,
          UPD_TIMESTAMP: 1000000000000,
          EFFECTIVE_DATE: 1000000000000,
          TRUE_COLOURGROUP_EN: 'trueColourGroupEn',
          TRUE_COLOURGROUP_FR: 'trueColourGroupFr',
          LAST_MODIFIED_DATE: 1470391439001, // circa 2016,
          SIZE_CHART: 16
      }
  }]
};

const message = validParams.messages[0];

const messageWithoutLastModifiedDate = {
  ...message,
  value: { ...message.value, LAST_MODIFIED_DATE: undefined }
};

const ctStyleNewer = {
  "masterData": {
    [entityStatus]: {
      "masterVariant": {
        "prices": [{
          id: 'originalPrice',
          custom: {
            fields: {
              isOriginalPrice: true
            }
          }
        }],
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

const ctStyleNewerWithEmptyPrices = {
  "masterData": {
    [entityStatus]: {
      "masterVariant": {
        "prices": [],
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
    [entityStatus]: {
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

const styleActions = [
  {
    action: 'setAttributeInAllVariants',
    name: 'brandName',
    staged: false,
    value: { 'en-CA': 'brandNameEng', 'fr-CA': 'brandNameFr' },
  },
  {
    action: 'setAttributeInAllVariants',
    name: 'construction',
    staged: false,
    value: { 'en-CA': 'detailDescEng', 'fr-CA': 'detailDescFr' },
  },
  {
    action: 'setAttributeInAllVariants',
    name: 'fabricAndMaterials',
    staged: false,
    value: { 'en-CA': 'fabricAndMaterialEn', 'fr-CA': 'fabricAndMaterialFr' },
  },
  {
    action: 'setAttributeInAllVariants',
    name: 'styleAndMeasurements',
    staged: false,
    value: { 'en-CA': 'sizeDescEng', 'fr-CA': 'sizeDescFr' },
  },
  {
    action: 'setAttributeInAllVariants',
    name: 'careInstructions',
    staged: false,
    value: { 'en-CA': 'careInstructionsEn', 'fr-CA': 'careInstructionsFr' },
  },
  {
    action: 'setAttributeInAllVariants',
    name: 'advice',
    staged: false,
    value: { 'en-CA': 'adviceEn', 'fr-CA': 'adviceFr' },
  },
  {
    action: 'setAttributeInAllVariants',
    name: 'colour',
    staged: false,
    value: { 'en-CA': 'colourDescEng', 'fr-CA': 'colourDescFr' },
  },
  {
    action: 'setAttributeInAllVariants',
    name: 'colourGroup',
    staged: false,
    value: { 'en-CA': 'trueColourGroupEn', 'fr-CA': 'trueColourGroupFr' },
  },
  {
    action: 'setAttributeInAllVariants',
    name: 'webStatus',
    staged: false,
    value: false,
  },
  {
    action: 'setAttributeInAllVariants',
    name: 'season',
    staged: false,
    value: 'seasonCd',
  },
  {
    action: 'setAttributeInAllVariants',
    name: 'vsn',
    staged: false,
    value: 'vsn',
  },
  {
    action: 'setAttributeInAllVariants',
    name: 'sizeChart',
    staged: false,
    value: 16,
  },
  {
    action: 'setAttributeInAllVariants',
    name: 'relatedProductId',
    staged: false,
    value: 'vsn341brandNameEng',
  },
  {
    action: 'setAttributeInAllVariants',
    name: 'styleLastModifiedInternal',
    staged: false,
    value: new Date('2016-08-05T10:03:59.001Z'),
  },
  {
    action: 'changeName',
    name: { 'en-CA': 'descEng', 'fr-CA': 'descFr' },
    staged: false,
  },
  {
    action: 'setDescription',
    description: { 'en-CA': 'marketDescEng', 'fr-CA': 'marketDescFr' },
    staged: false,
  },
  {
    action: 'changePrice',
    priceId: ctStyleNewer.masterData[entityStatus].masterVariant.prices[0].id,
    staged: false,
    price: {
      value: {
        centAmount: validParams.messages[0].value.UNIT_PRICE * 100,
        currencyCode: 'CAD'
      },
      custom: {
        type: {
          key: 'priceCustomFields'
        },
        fields: {
          isOriginalPrice: true
        }
      }
    }
  },
  {
    action: 'addToCategory',
    category: { id: 'cat1', typeId: 'category' },
    staged: false,
  },
  {
    action: 'addToCategory',
    category: { id: 'cat2', typeId: 'category' },
    staged: false,
  },
  {
    action: 'addToCategory',
    category: { id: 'cat3', typeId: 'category' },
    staged: false,
  },
];

const jestaStyle = parseStyleMessageCt(message);
const mockedCtHelpers = getCtHelpers(validParams);

describe('formatLanguageKeys', () => {
  const localizedStringWithWrongKeys = {'en': 'foo', 'fr': 'bar'};
  const localizedStringWithRightKeys = {'en-CA': 'foo', 'fr-CA': 'bar'};
  const messageWithWrongLocalizedString = { 'foo': localizedStringWithWrongKeys };
  const messageWithRightLocalizedString = { 'foo': localizedStringWithRightKeys };

  it('when given an message object, returns an message object that is the same expect its language keys are CT-style', () => {
    expect(formatLanguageKeys(messageWithWrongLocalizedString)).toMatchObject(messageWithRightLocalizedString);
  });

  it('works when a message has multiple localized strings associated with it', () => {
    const messageWithTwoWrongLocalizedStrings = { 'foo': localizedStringWithWrongKeys, 'bar': localizedStringWithWrongKeys, 'biz': 1 };
    const messageWithTwoRightLocalizedStrings = { 'foo': localizedStringWithRightKeys, 'bar': localizedStringWithRightKeys, 'biz': 1 };
    expect(formatLanguageKeys(messageWithTwoWrongLocalizedStrings)).toMatchObject(messageWithTwoRightLocalizedStrings);
  });

  it('does not change the top-level keys of a message', () => {
    const messageWithConfusingKeyNames = { fr: 'not a localized string, despite the key name', foo: 'bar'};
    expect(formatLanguageKeys(messageWithConfusingKeyNames)).toMatchObject(messageWithConfusingKeyNames);
  });
});

describe('getCtStyleAttributeValue', () => {
  it('returns the correct value for the given style', () => {
    const actual = getCtStyleAttributeValue(ctStyleNewer, 'styleLastModifiedInternal');
    const expected = '2019-03-18T16:53:20.823Z';
    expect(actual).toBe(expected);
  });

  it('returns `undefined` if the attribute does not exist on the style', () => {
    expect(getCtStyleAttributeValue(ctStyleNewer, 'attributeThatDoesNotExist')).toBeUndefined();
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

  it('returns a message that lacks a `styleLastModifiedInternal` date if the JESTA corresponding date is undefined', () => {
    const parsedMessage = parseStyleMessageCt(messageWithoutLastModifiedDate);
    expect(parsedMessage.styleLastModifiedInternal).toBeUndefined();
  });
});

describe('existingCtStyleIsNewer', () => {
  it('returns true if existing CT style is newer than the given JESTA style', () => {
    expect(existingCtStyleIsNewer(ctStyleNewer, jestaStyle, styleAttributeNames.STYLE_LAST_MODIFIED_INTERNAL)).toBe(true);
  });

  it ('returns false if existing CT style is older than the given JESTA style', () => {
    expect(existingCtStyleIsNewer(ctStyleOlder, jestaStyle, styleAttributeNames.STYLE_LAST_MODIFIED_INTERNAL)).toBe(false);
  });

  it('returns `false` if JESTA style lacks a value for `styleLastModifiedInternal`', () => {
    const jestaStyleWithoutModifiedDate = {...jestaStyle, styleLastModifiedInternal: undefined };
    expect(existingCtStyleIsNewer(ctStyleOlder, jestaStyleWithoutModifiedDate, styleAttributeNames.STYLE_LAST_MODIFIED_INTERNAL)).toBe(false);
  });

  it('returns `false` if CT style lacks a value for `styleLastModifiedInternal`', () => {
    const ctStyleWithoutDate = {
        "masterData": {
        "staged": {
            "masterVariant": {
                "attributes": []
            }
        }
      }
    };
    expect(existingCtStyleIsNewer(ctStyleWithoutDate, jestaStyle)).toBe(false);
  });
});

describe('createStyle', () => {
  it('throws an error if the given style lacks an ID', () => {
    const styleWithNoId = {};
    return expect(createStyle(styleWithNoId, {}, null, mockedCtHelpers)).rejects.toThrow('Style lacks required key \'id\'');
  });
});

describe('updateStyle', () => {
  it('throws an error if the given style lacks an ID', () => {
    const styleWithNoId = {};
    return expect(updateStyle({ style: styleWithNoId, existingCtStyle: { version: '1' }, productType: 'product-type-reference-id', categories: null, ctHelpers: mockedCtHelpers })).rejects.toThrow('Style lacks required key \'id\'');
  });

  it('throws an error if called without a version number', () => {
    const style = { id: '1' };
    return expect(updateStyle({ style, existingCtStyle: {} , productType: 'product-type-reference-id', categories: null, ctHelpers: mockedCtHelpers })).rejects.toThrow('Invalid arguments: must include existing style \'version\'');
  });
});

describe('getCategory', () => {
  it('correct message; return mock data', async () => {
    const categoryName = validParams.messages[0].value.CATAGORY;
    return expect(await getCategory(categoryName, mockedCtHelpers)).toBeInstanceOf(Object);
  });
});

describe('getCategories', () => {
  it('correct message; return mock data', async () => {
     const result =  
        validParams.messages
        .filter(addErrorHandling(filterStyleMessages))
        .map(addErrorHandling(parseStyleMessageCt))
    const response = await getCategories(result[0], mockedCtHelpers);
    expect(response).toBeInstanceOf(Object);
  });
});

describe('createCategory', () => {
  it('correct message; return mock data', async () => {
     const result =  
        validParams.messages
        .filter(addErrorHandling(filterStyleMessages))
        .map(addErrorHandling(parseStyleMessageCt))
    const categories = await getCategories(result[0], mockedCtHelpers);
    const categoryName = result[0].level2Category;
    const categoryKey = categoryNameToKey(result[0].level1Category + result[0].level2Category);

    const response = await createCategory(categoryKey, categoryName, categories[0], mockedCtHelpers);

    expect(response).toBeInstanceOf(Object);
  });

  it('returns `null` when given a falsy value as a category key', async () => {
    const response = await createCategory('', 'categoryName', 'parentCategory', mockedCtHelpers);
    expect(response).toBe(null);
  });

  it('returns `null` when given a falsy value as a category name', async () => {
    const response = await createCategory('categoryKey', '', 'parentCategory', mockedCtHelpers);
    expect(response).toBe(null);
  });
});

describe('consumeCatalogueMessageCT', () => {
  it('throws an error if the given parameters are invalid', () => {
    const invalidParams = {};
    return expect(consumeCatalogueMessageCT(invalidParams)).rejects.toThrow();
  });

  it('returns `undefined` if given valid params', async () => {
    const response = await consumeCatalogueMessageCT(validParams);
    expect(response).toEqual({ errors: [], failureIndexes: [], successCount: 1 });
  });
});


describe('getUniqueCategoryIdsFromCategories', () => {
  it('returns an array of all category IDs when there are no duplicate IDs', () => {
    const allUniqueCategories = [{ id: '1' }, { id: '2' }, { id: '3' }];
    expect(getUniqueCategoryIdsFromCategories(allUniqueCategories)).toEqual(['1', '2', '3']);
  });

  it('returns an array of only the unique category IDs when there are duplicate IDs', () => {
    const categoriesWithDuplicateIds = [{ id: '1' }, { id: '1' }, { id: '2' }];
    expect(getUniqueCategoryIdsFromCategories(categoriesWithDuplicateIds)).toEqual(['1', '2']);
  });

  it('returns an empty array when given an empty array', () => {
    expect(getUniqueCategoryIdsFromCategories([])).toEqual([]);
  });

  it('returns `null` when given a falsy argument', () => {
    expect(getUniqueCategoryIdsFromCategories(undefined)).toBe(null);
    expect(getUniqueCategoryIdsFromCategories(null)).toBe(null);
  });
});

describe('getActionsFromStyle', () => {
  const mockCtStyleWithoutCategories = {
    ...ctStyleNewer,
    masterData: {
      [entityStatus]: {
        variants: [],
        ...ctStyleNewer.masterData[entityStatus],
        categories: []
      }
    }
  };
  const mockCtStyleWithCategories = {
    ...ctStyleNewer,
    masterData: {
      [entityStatus]: {
        variants: [],
        ...ctStyleNewer.masterData[entityStatus],
        categories: [{
          typeId: 'category',
          id: 'cat4'
        }]
      }
    },
    staged: isStaged
  };
  const mockCtStyleWithoutOriginalPrice = {
    ...ctStyleNewerWithEmptyPrices,
    masterData: {
      [entityStatus]: {
        variants: [],
        ...ctStyleNewerWithEmptyPrices.masterData[entityStatus],
        categories: []
      }
    }
  };
  const mockProductType = { attributes: [] };
  const mockCategories = [{ id: 'cat1' }, { id: 'cat2' }, { id: 'cat3' }];

  it('returns the correct actions when given a style to which categories should be added', () => {
    const expected = styleActions;
    expect(getActionsFromStyle(jestaStyle, mockProductType, mockCategories, mockCtStyleWithoutCategories)).toEqual(expected);
  });

  it('returns the correct actions when given a style from which categories should be removed', () => {
    const expected = [...styleActions, {
        action: 'removeFromCategory',
        category: { id: 'cat4', typeId: 'category' },
        staged: false,
      },
    ];

    expect(getActionsFromStyle(jestaStyle, mockProductType, mockCategories, mockCtStyleWithCategories)).toEqual(expected);
  });

  it('includes the correct actions when given a style that initially didnt have its original price set', () => {
    const expected = [
      {
        action: 'setPrice',
        price: {
          value: {
            centAmount: validParams.messages[0].value.UNIT_PRICE * 100,
            currencyCode: 'CAD'
          },
          custom: {
            type: {
              key: 'priceCustomFields'
            },
            fields: {
              isOriginalPrice: true
            }
          }
        },
        staged: isStaged
      }
    ];
    
    expect(getActionsFromStyle(jestaStyle, mockProductType, mockCategories, mockCtStyleWithoutOriginalPrice)).toEqual(expect.arrayContaining(expected));
  });
});
