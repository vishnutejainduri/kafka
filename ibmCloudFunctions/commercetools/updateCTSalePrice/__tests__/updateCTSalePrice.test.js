const updateCTSalePrice = require('../');
const getCtHelpers = require('../../../lib/commercetoolsSdk');
const { updateStyleMarkdown } = require('../utils');

jest.mock('mongodb');
jest.mock('@commercetools/sdk-client');
jest.mock('@commercetools/api-request-builder');
jest.mock('@commercetools/sdk-middleware-auth');
jest.mock('@commercetools/sdk-middleware-http');
jest.mock('node-fetch');

const validParams = {
    topicName: 'sale-prices-connect-jdbc',
    ctpProjectKey: 'key',
    ctpClientId: 'id',
    ctpClientSecret: 'secret',
    ctpAuthUrl: 'authUrl',
    ctpApiUrl: 'apiUrl',
    ctpScopes: 'manage_products:harryrosen-dev',
    productTypeId: 'product-type-reference-id',
    mongoUri: 'mongoUri',
    dbName: 'dbName',
    collectionName: 'prices',
    mongoCertificateBase64: 'mongoCertificateBase64'
};

const validStyleParams = {
  topicName: 'sale-prices-connect-jdbc',
  ctpProjectKey: 'key',
  ctpClientId: 'id',
  ctpClientSecret: 'secret',
  ctpAuthUrl: 'authUrl',
  ctpApiUrl: 'apiUrl',
  ctpScopes: 'manage_products:harryrosen-dev',
  productTypeId: 'product-type-reference-id',
  mongoUri: 'mongoUri',
  dbName: 'dbName',
  collectionName: 'prices',
  mongoCertificateBase64: 'mongoCertificateBase64',
  value: {
      STYLEID: 'success-with-priceChange',
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
      LAST_MODIFIED_DATE: 1470391439001, // circa 2016,
      SIZE_CHART: 16
  }
}

const mockedCtHelpers = getCtHelpers(validParams);

describe('updateCTSalePrice', () => {
    it('Runs CF; returns valid result', async () => {
        const response = await updateCTSalePrice(validParams);
        expect(response).toEqual({
            errors: [],
            failureIndexes: [],
            successCount: 1,
            shouldResolveOffsets: 1
        });
    });

    it('Runs CF with messages; returns valid result', async () => {
        const response = await updateCTSalePrice(validStyleParams);
        expect(response).toEqual({
            errors: [],
            failureIndexes: [],
            successCount: 1,
            shouldResolveOffsets: 1
        });
    });

    it('returns an object with an error attribute and `shouldResolveOffsets` set to 1 when given invalid params as an argument', async () => {
      const invalidParams = {}
      const response = await updateCTSalePrice(invalidParams);
      expect(response.error).not.toBeUndefined();
      expect(response.shouldResolveOffsets).toBe(1);
    });
});

describe('updateStyleMarkdown', () => {
    it('valid permanent markdown update; onSale flag should be changed to true', async () => {
      const applicablePriceChanges = {
        '00990': {
          newRetailPrice: 99.99,
          endDate: null
        },
        '00011': {
          newRetailPrice: 10.99,
          endDate: new Date(2020)
        }
      }
      const result = await updateStyleMarkdown(mockedCtHelpers, validParams.productTypeId, applicablePriceChanges);
      expect(result).toBeInstanceOf(Object);
    })
    it('temporary markdown should cause no price update; onSale flag should be changed to true', async () => {
      const applicablePriceChanges = {
        '00990': {
          newRetailPrice: 99.99,
          startDate: new Date(2018),
          endDate: new Date(2020)
        },
        '00011': {
          newRetailPrice: 10.99,
          startDate: new Date(2018),
          endDate: new Date(2020)
        }
      }
      const result = await updateStyleMarkdown(mockedCtHelpers, validParams.productTypeId, applicablePriceChanges);
      expect(result).toBeInstanceOf(Object);
    })
    it('markdown is not for online should cause no update; onSale flag should not be affected', async () => {
      const applicablePriceChanges = {
        '00011': {
          newRetailPrice: 10.99,
          endDate: new Date(2020)
        }
      }
      const result = await updateStyleMarkdown(mockedCtHelpers, validParams.productTypeId, applicablePriceChanges);
      expect(result).toEqual(null);
    })
    it('no markdown currently applied should cause a revert to original price; onSale flag should be changed to false', async () => {
      const applicablePriceChanges = {
        '00990': undefined,
        '00011': undefined
      }
      const result = await updateStyleMarkdown(mockedCtHelpers, validParams.productTypeId, applicablePriceChanges);
      expect(result).toBeInstanceOf(Object);
    })
    it('no markdown currently applied should cause a revert to original price; onSale flag should be changed to false', async () => {
      const applicablePriceChanges = {}
      const result = await updateStyleMarkdown(mockedCtHelpers, validParams.productTypeId, applicablePriceChanges);
      expect(result).toBeInstanceOf(Object);
    })
});

describe('testStubs; documenting test cases', () => {
  it('if current markdown is a valid site 990 permanent markdown; update CT with new permanent markdown + onSale flag should be changed to true', () => {});
  it('if current markdown is a valid site 990 temporary markdown; onSale flag should be changed to true', () => {});
  it('if current markdown is a valid site 00011 permanent markdown; do nothing', () => {});
  it('if current markdown is a valid site 00011 temporary markdown; do nothing', () => {});
  it('if there is no current markdown and style has an original price in CT; update CT with original price + onSale flag should be changed to false', () => {});
  it('if there is no current markdown and style has no original price in CT; do nothing', () => {});
});
