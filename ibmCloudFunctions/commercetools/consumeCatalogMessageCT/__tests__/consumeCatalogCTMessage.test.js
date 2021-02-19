const getCtHelpers = require('../../../lib/commercetoolsSdk');
const consumeCatalogueMessageCT = require('..');
const { parseStyleMessageCt, formatLanguageKeys } = require('../../../lib/parseStyleMessageCt');
const { filterStyleMessages } = require('../../../lib/parseStyleMessage');
const { addErrorHandling } = require('../../../product-consumers/utils');
const {
  createStyle,
  updateStyle,
  updateCategory,
  existingCtStyleIsNewer,
  getCtStyleAttributeValue,
  getCategory,
  createOrUpdateCategoriesFromStyle,
  getUniqueCategoryIdsFromCategories,
  createCategory,
  categoryKeyFromNames,
  getActionsFromStyle
} = require('../../styleUtils');
const { languageKeys, styleAttributeNames, isStaged, entityStatus, MICROSITES_ROOT_CATEGORY } = require('../../constantsCt');

jest.mock('@commercetools/sdk-client');
jest.mock('@commercetools/api-request-builder');
jest.mock('@commercetools/sdk-middleware-auth');
jest.mock('@commercetools/sdk-middleware-http');
jest.mock('node-fetch');

const validMessage = {
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
      CATEGORY_EN: 'category_en',
      CATEGORY_FR: 'category_fr',
      CATEGORY_LEVEL_1A_EN: 'categoryLevel1A_en',
      CATEGORY_LEVEL_1A_FR: 'categoryLevel1A_fr',
      CATEGORY_LEVEL_2A_EN: 'categoryLevel2A_en',
      CATEGORY_LEVEL_2A_FR: 'categoryLevel2A_fr',
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
      LASTMODIFIEDDATE: 1470391439002, // circa 2016,
      LASTMODIFIEDDATE_COLOURS: 1470391439001,
      SIZE_CHART: 16
  }
};

const invalidMessage = {
  topic: 'styles-connect-jdbc-CATALOG',
  value: {
      STYLEID: '20000000'
  }
};

const validParams = {
  topicName: 'styles-connect-jdbc-CATALOG',
  ctpProjectKey: 'key',
  ctpClientId: 'id',
  ctpClientSecret: 'secret',
  ctpAuthUrl: 'authUrl',
  ctpApiUrl: 'apiUrl',
  ctpScopes: 'manage_products:harryrosen-dev',
  productTypeId: 'product-type-reference-id',
  messages: [validMessage]
};

const message = validParams.messages[0];

const messageWithoutLastModifiedDate = {
  ...message,
  value: { ...message.value, LASTMODIFIEDDATE: undefined, LASTMODIFIEDDATE_COLOURS: undefined }
};

const messageWithMoreRecentLastModifiedDateColours = {
  ...message,
  value: { ...message.value, LASTMODIFIEDDATE: undefined }
};

const ctStyleNewer = {
  "masterData": {
    [entityStatus]: {
      "masterVariant": {
        "prices": [{
          id: 'originalPrice',
          custom: {
            fields: {
              priceType: 'originalPrice'
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
        "id": "master-variant",
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
    name: 'originalPrice',
    staged: false,
    value: 100
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
    name: 'isEndlessAisle',
    staged: false,
    value: false,
  },
  {
    action: 'setAttributeInAllVariants',
    name: 'isReturnable',
    staged: false,
    value: false
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
    value: new Date('2016-08-05T10:03:59.002Z'),
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
      country: 'CA',
      value: {
        centAmount: validParams.messages[0].value.UNIT_PRICE * 100,
        currencyCode: 'CAD'
      },
      custom: {
        type: {
          key: 'priceCustomFields'
        },
        fields: {
          priceType: 'originalPrice'
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
  {
    action: 'setTaxCategory',
    taxCategory: {
      key: 'jesta-tax-descriptions'
    }
  }
];

const jestaStyle = parseStyleMessageCt(message);
// See ../../__mocks__
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

  it('returns a message that uses the colours lastmodifieddate if the JESTA colours corresponding date is higher', () => {
    const parsedMessage = parseStyleMessageCt(messageWithMoreRecentLastModifiedDateColours);
    expect(parsedMessage.styleLastModifiedInternal).toEqual(new Date(messageWithMoreRecentLastModifiedDateColours.value.LASTMODIFIEDDATE_COLOURS))
  });

  it('returns a message that has a promo sticker if the style is endless aisle and is returnable', () => {
    const eaMessage = { ...message, value: { ...message.value, EA_IND: 'Y', RETURNABLE_IND: 'Y' } };
    const parsedEaMessage = parseStyleMessageCt(eaMessage);
    expect(parsedEaMessage.promotionalSticker).toEqual({
      'en-CA': 'Online Only',
      'fr-CA': 'En ligne seulement'
    });
  });

  it('returns a message that has no promo sticker if the style is not endless aisle and is returnable', () => {
    const nonEaMessage = { ...message, value: { ...message.value, EA_IND: 'N', RETURNABLE_IND: 'Y' } };
    const parsedNonEaMessage = parseStyleMessageCt(nonEaMessage);
    expect(parsedNonEaMessage.promotionalSticker).toBeUndefined();
  });

  it('returns a message that has the final sale promo sticker if the style is endless aisle and is not returnable', () => {
    const finalSaleMessage = { ...message, value: { ...message.value, EA_IND: 'Y', RETURNABLE_IND: 'N' } }
    const parsedFinalSaleMessage = parseStyleMessageCt(finalSaleMessage)
    expect(parsedFinalSaleMessage.promotionalSticker).toEqual({
      'en-CA': 'Final Sale',
      'fr-CA': 'Final Sale'
    })
  })

  it('returns a message that has the final sale promo sticker if the style is not endless aisle and is not returnable', () => {
    const noEndlessAisleNoReturnableMessage = { ...message, value: { ...message.value, EA_IND: 'N', RETURNABLE_IND: 'N' } }
    const parsedNoEndlessAisleNoReturnableMessage = parseStyleMessageCt(noEndlessAisleNoReturnableMessage)
    expect(parsedNoEndlessAisleNoReturnableMessage.promotionalSticker).toEqual({
      'en-CA': 'Final Sale',
      'fr-CA': 'Final Sale'
    })
  })
});

describe('categoryKeyFromNames', () => {
  it('should only allow certain characters to match CT', () => {
    const actual = categoryKeyFromNames('Aa 123_- !@#');
    expect(actual).toEqual('Aa123_');
  });

  it('should handle either name strings or CT localizeString objects', () => {
    const actual = categoryKeyFromNames({
      [languageKeys.ENGLISH]: 'name_en',
      [languageKeys.FRENCH]: 'name_fr',
    });
    const actual2 = categoryKeyFromNames('name_en');
    expect(actual).toEqual('name_en');
    expect(actual2).toEqual('name_en');
  });

  it('should handle blank localizedStrings', () => {
    const actual = categoryKeyFromNames('root', {
      [languageKeys.ENGLISH]: '',
      [languageKeys.FRENCH]: '',
    }, 'name_l2');
    expect(actual).toEqual('root-l1-l2name_l2');
  });

  it('should generate different category keys for the same category name at different levels', () => {
    const actual = categoryKeyFromNames('root', 'leaf');
    const actual2 = categoryKeyFromNames('root', '', 'leaf');
    expect(actual).toEqual('root-l1leaf');
    expect(actual2).toEqual('root-l1-l2leaf');
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
  it('should return the CT category given a valid message', async () => {
    const categoryName = validParams.messages[0].value.CATEGORY_EN;
    return expect(await getCategory(categoryName, mockedCtHelpers)).toBeInstanceOf(Object);
  });
});

describe('createOrUpdateCategoriesFromStyle', () => {
  it('correct message; return mock data', async () => {
     const result =
        validParams.messages
        .filter(addErrorHandling(filterStyleMessages))
        .map(addErrorHandling(parseStyleMessageCt));
    const response = await createOrUpdateCategoriesFromStyle(result[0], mockedCtHelpers);
    expect(response).toBeInstanceOf(Object);
  });

  it('should update categories if they exist in the style data and don\'t match existing CT categories', async () => {
    mockedCtHelpers.client.mocks.mockUpdateFn.mockReset();
    const validMessageUpdatedCategory = {
      topic: 'styles-connect-jdbc-CATALOG',
      value: {
        ... validParams.messages[0].value,
        CATEGORY_LEVEL_1A_FR: 'updated_fr_value'
      }
    };
    const style = parseStyleMessageCt(validMessageUpdatedCategory);
    await createOrUpdateCategoriesFromStyle(style, mockedCtHelpers);

    expect(mockedCtHelpers.client.mocks.mockUpdateFn.mock.calls.length).toEqual(1);
    expect(mockedCtHelpers.client.mocks.mockUpdateFn.mock.calls[0])
      .toEqual([
        'POST',
        'DPMROOTCATEGORY-l1category_en-l2categoryLevel1A_en',
        '{"version":1,"actions":[{"action":"changeName","name":{"en-CA":"categoryLevel1A_en","fr-CA":"updated_fr_value"}},{"action":"changeParent","parent":{"id":"8f1b6d78-c29d-46cf-88fe-5bd935e49fd9","typeId":"category"}}]}'
      ]);
    mockedCtHelpers.client.mocks.mockUpdateFn.mockReset();
  });

  it('should create categories if they exist in the style data but not CT', async () => {
    mockedCtHelpers.client.mocks.mockUpdateFn.mockReset();
    const validMessageNewCategory = {
      topic: 'styles-connect-jdbc-CATALOG',
      value: {
        ... validParams.messages[0].value,
        CATEGORY_LEVEL_2A_EN: 'new_category_en',
        CATEGORY_LEVEL_2A_FR: 'new_category_fr'
      }
    };
    const style = parseStyleMessageCt(validMessageNewCategory);
    await createOrUpdateCategoriesFromStyle(style, mockedCtHelpers);

    expect(mockedCtHelpers.client.mocks.mockUpdateFn.mock.calls.length).toEqual(1);
    expect(mockedCtHelpers.client.mocks.mockUpdateFn.mock.calls[0])
      .toEqual([
        'POST',
        'category',
        '{"key":"DPMROOTCATEGORY-l1category_en-l2categoryLevel1A_en-l3new_category_en","name":{"en-CA":"new_category_en","fr-CA":"new_category_fr"},"slug":{"en-CA":"DPMROOTCATEGORY-l1category_en-l2categoryLevel1A_en-l3new_category_en","fr-CA":"DPMROOTCATEGORY-l1category_en-l2categoryLevel1A_en-l3new_category_en"},"parent":{"id":"8f1b6d78-c29d-46cf-88fe-5bd935e49fd9","typeId":"category"}}'
      ]);
    mockedCtHelpers.client.mocks.mockUpdateFn.mockReset();
  });

  // TODO this is not implemented in the code. It's an edge case but ideally we would.
  it.todo('should remove categories that are removed from the style');
});

describe('createOrUpdateCategoriesFromStyle + BRANDS', () => {
  it('should create brand categories if they exist in the style data but not CT', async () => {
    mockedCtHelpers.client.mocks.mockUpdateFn.mockReset();
    const validMessageNewCategory = {
      topic: 'styles-connect-jdbc-CATALOG',
      value: {
        ... validParams.messages[0].value,
        BRAND_NAME_ENG: 'updated_brand_name_en',
      }
    };
    const style = parseStyleMessageCt(validMessageNewCategory);
    await createOrUpdateCategoriesFromStyle(style, mockedCtHelpers);

    expect(mockedCtHelpers.client.mocks.mockUpdateFn.mock.calls.length).toEqual(1);
    expect(mockedCtHelpers.client.mocks.mockUpdateFn.mock.calls[0])
      .toEqual([
        'POST',
        'category',
        '{"key":"BRANDS-l1updated_brand_name_en","name":{"en-CA":"updated_brand_name_en","fr-CA":"updated_brand_name_en"},"slug":{"en-CA":"BRANDS-l1updated_brand_name_en","fr-CA":"BRANDS-l1updated_brand_name_en"},"parent":{"id":"8f1b6d78-c29d-46cf-88fe-5bd935e49fd9","typeId":"category"}}'
      ]);
    mockedCtHelpers.client.mocks.mockUpdateFn.mockReset();
  });
});

describe('createCategory', () => {
  it('correct message; return mock data', async () => {
     const result =
        validParams.messages
        .filter(addErrorHandling(filterStyleMessages))
        .map(addErrorHandling(parseStyleMessageCt))
    const categories = await createOrUpdateCategoriesFromStyle(result[0], mockedCtHelpers);
    const categoryName = result[0].level2Category;
    const categoryKey = categoryKeyFromNames(result[0].level1Category, result[0].level2Category);

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

describe('updateCategory', () => {
  it('should return the proper update actions and endpoint URI', async () => {
    mockedCtHelpers.client.mocks.mockUpdateFn.mockReset();
    await updateCategory('categoryKey', 1, {
      [languageKeys.ENGLISH]: 'new category name en',
      [languageKeys.FRENCH]: 'new category name fr',
    }, {
      id: 'parent_category_id'
    }, mockedCtHelpers);

    expect(mockedCtHelpers.client.mocks.mockUpdateFn.mock.calls.length).toEqual(1);
    expect(mockedCtHelpers.client.mocks.mockUpdateFn.mock.calls[0]).toEqual([
      'POST',
      'categoryKey',
      '{"version":1,"actions":[{"action":"changeName","name":{"en-CA":"new category name en","fr-CA":"new category name fr"}},{"action":"changeParent","parent":{"id":"parent_category_id","typeId":"category"}}]}'
    ]);
    mockedCtHelpers.client.mocks.mockUpdateFn.mockReset();
  });
});

describe('consumeCatalogueMessageCT', () => {
  it('Returns an error if the given parameters are invalid', async () => {
    const invalidParams = {};
    return expect((await consumeCatalogueMessageCT(invalidParams)).errorResult).toBeTruthy();
  });

  it('returns failure indexes result if given valid params but an invalid message', async () => {
    const result = await consumeCatalogueMessageCT({ ...validParams, messages: [invalidMessage]});
    expect(result).toMatchObject({ messages: result.messages, batchSuccessCount: 0, messagesCount: 1, failureIndexes: [0], shouldResolveOffsets: 0 });
  });


  it('returns success result if given valid params and a valid message', async () => {
    const response = await consumeCatalogueMessageCT(validParams);
    expect(response).toEqual({ messages: response.messages, batchSuccessCount: 1, messagesCount: 1, ok: true, shouldResolveOffsets: 1 });
  });

  it('returns one success result if given valid params and two valid messages for the same style', async () => {
    const response = await consumeCatalogueMessageCT({
      ...validParams,
      messages: [validMessage, validMessage]
    });
    expect(response).toEqual({ messages: response.messages, batchSuccessCount: 1, messagesCount: 2, ok: true, shouldResolveOffsets: 1 });
  });

  it('returns two success results if given valid params and two valid messages for different styles', async () => {
    const response = await consumeCatalogueMessageCT({
      ...validParams,
      messages: [validMessage, { ...validMessage, value: { ...validMessage.value, STYLEID: '20000001' } }]
    });
    expect(response).toEqual({ messages: response.messages, batchSuccessCount: 2, messagesCount: 2, ok: true, shouldResolveOffsets: 1 });
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
          id: 'cat4',
          obj: {
            parent: {
              obj: {
                key: 'DPM_ROOT_CATEGORY'
              }
            }
          }
        }]
      }
    },
    staged: isStaged
  };
  const mockCtStyleWithMicrositeCategory = {
    ...ctStyleNewer,
    masterData: {
      [entityStatus]: {
        variants: [],
        ...ctStyleNewer.masterData[entityStatus],
        categories: [{
          typeId: 'category',
          id: 'cat_microsite',
          obj: {
            parent: {
              obj: {
                key: MICROSITES_ROOT_CATEGORY
              }
            }
          }
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
    const removeAction = {
        action: 'removeFromCategory',
        category: { id: 'cat4', typeId: 'category' },
        staged: false,
    }

    expect(getActionsFromStyle(jestaStyle, mockProductType, mockCategories, mockCtStyleWithCategories)).toEqual(expect.arrayContaining([removeAction]));
  });

  it('returns the correct actions when given a style from microsite categories should not be removed', () => {
    const styleUpdateActions = getActionsFromStyle(jestaStyle, mockProductType, mockCategories, mockCtStyleWithMicrositeCategory)
    const removeCategoryAction = styleUpdateActions.find(updateAction => updateAction.action === 'removeFromCategory')

    expect(removeCategoryAction).toEqual(undefined);
  });

  it('includes the correct actions when given a style that initially didnt have its original price set', () => {
    const expected = [
      {
        action: 'addPrice',
        variantId: 'master-variant',
        price: {
          country: 'CA',
          value: {
            centAmount: validParams.messages[0].value.UNIT_PRICE * 100,
            currencyCode: 'CAD'
          },
          custom: {
            type: {
              key: 'priceCustomFields'
            },
            fields: {
              priceType: 'originalPrice'
            }
          }
        },
        staged: isStaged
      }
    ];

    expect(getActionsFromStyle(jestaStyle, mockProductType, mockCategories, mockCtStyleWithoutOriginalPrice)).toEqual(expect.arrayContaining(expected));
  });

  it('does not include an action to set the tax category if it was already set on the style', () => {
    const mockStyleThatHasATaxCategory = {
      ...mockCtStyleWithoutCategories,
      taxCategory: {
        typeId: 'tax-category',
        id: 't-1'
      }
    };

    const taxCategoryUpdateAction = {
      action: 'setTaxCategory',
      taxCategory: {
        key: 'jesta-tax-descriptions'
      }
    };

    expect(getActionsFromStyle(jestaStyle, mockProductType, mockCategories, mockStyleThatHasATaxCategory)).toEqual(expect.not.arrayContaining([taxCategoryUpdateAction]));
  })
});
