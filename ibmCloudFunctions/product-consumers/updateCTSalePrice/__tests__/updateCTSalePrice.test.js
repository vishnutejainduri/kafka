const updateCTSalePrice = require('../');
const getCtHelpers = require('../../../lib/commercetoolsSdk');
const { updateStylePermanentMarkdown } = require('../utils');

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

const mockedCtHelpers = getCtHelpers(validParams);

describe('updateCTSalePrice', () => {
    it('Runs CF; returns valid result', async () => {
        const response = await updateCTSalePrice(validParams);
        expect(response).toEqual({
            counts: {
                styleIds: 1,
                successes: 1,
                failures: 0
            },
            styleIds: [ 'success' ],
            failureIndexes: []
        });
    });

    it('Runs CF; returns failed result with no params', async () => {
        await expect(updateCTSalePrice({})).rejects.toThrow();
    });
});

describe('updateStylePermanentMarkdown', () => {
    it('valid permanent markdown update', async () => {
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
      const result = await updateStylePermanentMarkdown(mockedCtHelpers, validParams.productTypeId, applicablePriceChanges);
      expect(result).toBeInstanceOf(Object);
    })
    it('no permanent markdown; should cause no price update but should cause a onSale price flag update', async () => {
      const applicablePriceChanges = {
        '00990': {
          newRetailPrice: 99.99,
          endDate: new Date(2020)
        },
        '00011': {
          newRetailPrice: 10.99,
          endDate: new Date(2020)
        }
      }
      const result = await updateStylePermanentMarkdown(mockedCtHelpers, validParams.productTypeId, applicablePriceChanges);
      expect(result).toBeInstanceOf(Object);
    })
    it('no online sale; should cause no update', async () => {
      const applicablePriceChanges = {
        '00011': {
          newRetailPrice: 10.99,
          endDate: new Date(2020)
        }
      }
      const result = await updateStylePermanentMarkdown(mockedCtHelpers, validParams.productTypeId, applicablePriceChanges);
      expect(result).toEqual(null);
    })
    it('no markdown of any kind; should cause a revert to original price', async () => {
      const applicablePriceChanges = {
        '00990': undefined,
        '00011': undefined
      }
      const result = await updateStylePermanentMarkdown(mockedCtHelpers, validParams.productTypeId, applicablePriceChanges);
      expect(result).toBeInstanceOf(Object);
    })
});
