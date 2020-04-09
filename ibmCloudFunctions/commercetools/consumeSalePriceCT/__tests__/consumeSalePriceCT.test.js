const getCtHelpers = require('../../../lib/commercetoolsSdk');
const consumeSalePriceCT = require('..');
const { preparePriceUpdate, updateStylePrice } = require('../utils');
const {
    filterPriceMessages,
    parsePriceMessage,
    ONLINE_SITE_ID
} = require('../../../lib/parsePriceMessage');
const {
  addErrorHandling,
} = require('../../../product-consumers/utils');

jest.mock('@commercetools/sdk-client');
jest.mock('@commercetools/api-request-builder');
jest.mock('@commercetools/sdk-middleware-auth');
jest.mock('@commercetools/sdk-middleware-http');
jest.mock('node-fetch');

const validParams = {
  topicName: 'prices-connect-jdbc',
  ctpProjectKey: 'key',
  ctpClientId: 'id',
  ctpClientSecret: 'secret',
  ctpAuthUrl: 'authUrl',
  ctpApiUrl: 'apiUrl',
  ctpScopes: 'manage_products:harryrosen-dev',
  productTypeId: 'product-type-reference-id',
  messages: [{
      topic: 'prices-connect-jdbc',
      value: {
        STYLE_ID: 'styleId',
        NEW_RETAIL_PRICE: 'newRetailPrice',
        START_DATE: 'startDate',
        SITE_ID: '00990'
      }
  }]
};

const mockedCtHelpers = getCtHelpers(validParams);

describe('preparePriceUpdate', () => {
  it('should update price', async () => {
     const result =  
        validParams.messages
        .filter(addErrorHandling(filterPriceMessages))
        .map(addErrorHandling(parsePriceMessage))
        .filter(addErrorHandling(update => update.siteId === ONLINE_SITE_ID))

    const response = await preparePriceUpdate(mockedCtHelpers, validParams.productTypeId, result[0]);
    expect(response.variantPrices[0].updatedPrice.currentPrice).toBeNull();
  });

  it('should not update price', async () => {
     validParams.messages[0].value.NEW_RETAIL_PRICE = null;
     const result =  
        validParams.messages
        .filter(addErrorHandling(filterPriceMessages))
        .map(addErrorHandling(parsePriceMessage))
        .filter(addErrorHandling(update => update.siteId === ONLINE_SITE_ID))

    const response = await preparePriceUpdate(mockedCtHelpers, validParams.productTypeId, result[0]);
    expect(response).toBeNull();
  });
});

describe('consumeSalePriceCT', () => {
  it('missing params; throw error', () => {
    return expect(consumeSalePriceCT({})).rejects.toThrow();
  });

  it('correct params', async () => {
    const response = await consumeSalePriceCT(validParams);
    return expect(response).toBe(undefined);
  });
});

describe('updateStylePrice', () => {
  it('returns an object when it is given `ctHelpers`, a product type, and a price', async () => {
    expect(typeof await updateStylePrice(mockedCtHelpers, '1', { version: 1, id: '1' }) === 'object').toBe(true);
  });
});
