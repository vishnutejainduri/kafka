const { createStyle, updateStyle } = require('../APIHelpers');
const consumeCatalogueMessageCT = require('../');

jest.mock('@commercetools/sdk-client');

describe('createStyle', () => {
  it('throws an error if the given style lacks an ID', () => {
    const styleWithNoId = {};
    return expect(createStyle(styleWithNoId)).rejects.toThrow('Style lacks required key \'id\'');
  });
});

describe('updateStyle', () => {
  it('throws an error if the given style lacks an ID', () => {
    const styleWithNoId = {};
    return expect(updateStyle(styleWithNoId, 1)).rejects.toThrow('Style lacks required key \'id\'');
  });

  it('throws an error if called without a version number', () => {
    const style = { id: '1' };
    return expect(updateStyle(style)).rejects.toThrow('Invalid arguments: must include \'version\'');
  });
});

describe('consumeCatalogueMessageCT', () => {
  it('throws an error if the given parameters are invalid', () => {
    const invalidParams = {};
    return expect(consumeCatalogueMessageCT(invalidParams)).rejects.toThrow();
  });

  it('returns `undefined` if given valid params', async () => {
    const validParams = {
      topicName: 'styles-connect-jdbc-CATALOG',
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
              TRUE_COLOURGROUP_FR: 'trueColourGroupFr'
          }
      }]
    };

    const response = await consumeCatalogueMessageCT(validParams);
    expect(response).toBeUndefined();
  });
});
