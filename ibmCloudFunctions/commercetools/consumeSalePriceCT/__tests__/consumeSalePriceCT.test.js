const { createClient } = require('@commercetools/sdk-client');

const consumeSalePriceCT = require('..');
const getCtHelpers = require('../../../lib/commercetoolsSdk');
const { updateStyleSalePrice, getAllVariantPrices, getExistingCtOriginalPrice, getActionsForVariantPrice } = require('../utils');
const {
    filterSalePriceMessages,
    parseSalePriceMessage
} = require('../../../lib/parseSalePriceMessage');
const {
  addErrorHandling,
} = require('../../../product-consumers/utils');
const { priceAttributeNames, isStaged } = require('../../constantsCt');

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
  messages: [{
      topic: 'sale-prices-connect-jdbc',
      value: {
        STYLE_ID: 'styleId',
        PRICE_CHANGE_ID: 'priceChangeId',
        START_DATE: 1000000000000,
        END_DATE: 1000000000000,
        ACTIVITY_TYPE: 'A',
        PROCESS_DATE_CREATED: 1000000000000,
        NEW_RETAIL_PRICE: 'newRetailPrice'
      }
  }]
};

const mockProduct = createClient().execute().body;
const mockedCtHelpers = getCtHelpers(validParams);

describe('consumeSalePriceCT', () => {
  it('missing params; throw error', () => {
    return expect(consumeSalePriceCT({})).rejects.toThrow();
  });

  it('correct params', async () => {
    const response = await consumeSalePriceCT(validParams);
    return expect(response).toBe(undefined);
  });
});

describe('updateStyleSalePrice', () => {
  it('runs without throwing an error for approve "A" action', async () => {
     const pricesToUpdate =
        validParams.messages
        .filter(addErrorHandling(filterSalePriceMessages))
        .map(addErrorHandling(parseSalePriceMessage))

    await updateStyleSalePrice(mockedCtHelpers, validParams.productTypeId, pricesToUpdate[0]);
  });
  it('runs without throwing an error for create "C" action', async () => {
     validParams.messages[0].value.ACTIVITY_TYPE = 'C';
     const result =  
        validParams.messages
        .filter(addErrorHandling(filterSalePriceMessages))
        .map(addErrorHandling(parseSalePriceMessage))

    await updateStyleSalePrice(mockedCtHelpers, validParams.productTypeId, result[0]);
  });
  it('should throw an error of trying to delete "D" a price that does not exist', async () => {
     validParams.messages[0].value.ACTIVITY_TYPE = 'D';
     const result =  
        validParams.messages
        .filter(addErrorHandling(filterSalePriceMessages))
        .map(addErrorHandling(parseSalePriceMessage))

    return expect(updateStyleSalePrice(mockedCtHelpers, validParams.productTypeId, result[0])).rejects.toThrow('Price does not exist');
  });
});

describe('getAllVariantPrices', () => {
  it('just gets all variant prices from mock', async () => {
    const response = await getAllVariantPrices(mockProduct);
    const expectedResponse = [{"prices": [{"custom": {"fields": {"isOriginalPrice": true}, "type": {"id": "af9c14ac-6b56-48d4-b152-2b751d2c9c24", "typeId": "type"}}, "id": "9e194fab-2c79-4bdf-a990-dc344c8c1f63", "value": {"centAmount": 20199, "currencyCode": "CAD", "fractionDigits": 2, "type": "centPrecision"}}], "variantId": undefined}, {"prices": [{"custom": {"fields": {"isOriginalPrice": true}, "type": {"id": "af9c14ac-6b56-48d4-b152-2b751d2c9c24", "typeId": "type"}}, "id": "9e194fab-2c79-4bdf-a990-dc344c8c1f63", "value": {"centAmount": 20199, "currencyCode": "CAD", "fractionDigits": 2, "type": "centPrecision"}}], "variantId": undefined}];

    expect(response).toStrictEqual(expectedResponse);
  });
});

describe('getExistingCtOriginalPrice', () => {
  it('gets existing ct price with isOriginalPrice flag as true', async () => {
    const response = await getExistingCtOriginalPrice(mockProduct.masterData.current.masterVariant);
    const expectedResponse = {"custom": {"fields": {"isOriginalPrice": true}, "type": {"id": "af9c14ac-6b56-48d4-b152-2b751d2c9c24", "typeId": "type"}}, "id": "9e194fab-2c79-4bdf-a990-dc344c8c1f63", "value": {"centAmount": 20199, "currencyCode": "CAD", "fractionDigits": 2, "type": "centPrecision"}};

    expect(response).toStrictEqual(expectedResponse);
  });
});

describe('getActionsForVariantPrice', () => {
  const variantPrice = {
    variantId: 'some-variant-id',
    prices: [{
      id: 'some-price-id',
      custom: {
        fields: {
          [priceAttributeNames.PRICE_CHANGE_ID]: 'existing-price-change-id',
        }
      }
    }]
  };

  const baseParsedPriceMessage = {
    variantId: variantPrice.variantId,
    newRetailPrice: 10,
    processDateCreated: new Date('2020-01-01'),
    startDate: new Date('2020-01-01'),
    endDate: new Date('2020-02-02'),
    isOriginalPrice: false
  };

  const baseExpectedAction = {
    price: {
      value: { currencyCode: 'CAD', centAmount: baseParsedPriceMessage.newRetailPrice * 100 },
      validFrom: baseParsedPriceMessage.startDate,
      validUntil: baseParsedPriceMessage.endDate,
      custom: {
        type: { key: 'priceCustomFields' },
        fields: {
          processDateCreated: baseParsedPriceMessage.processDateCreated,
          isOriginalPrice: false
        }
      }
    },
    staged: isStaged,
    action: 'addPrice'
  };

  describe('there is no existing price', () => {
    it('returns an "add price" action for activity types approve "A" and create "C"', () => {
      const activityTypes = ['A', 'C'];
      activityTypes.forEach(activityType => {
        const parsedPriceMessage = {
          ...baseParsedPriceMessage,
          activityType,
          priceChangeId: 'different-from' + variantPrice.prices[0].custom.fields[priceAttributeNames.PRICE_CHANGE_ID],
        }
        const actions = getActionsForVariantPrice(parsedPriceMessage, variantPrice);

        baseExpectedAction.price.custom.fields[priceAttributeNames.PRICE_CHANGE_ID] = parsedPriceMessage.priceChangeId
        const expectedActions = [{
          ...baseExpectedAction,
          action: 'addPrice',
          variantId: variantPrice.variantId
        }]
        expect(actions).toEqual(expectedActions);
      });
    });
  });

  describe('there is an existing price', () => {
    describe('and it is outdated i.e. older than the incoming price message', () => {
      it('returns a "change price" action for activity types approve "A" and create "C"', () => {
        const activityTypes = ['A', 'C'];
        activityTypes.forEach(activityType => {
          const parsedPriceMessage = {
            ...baseParsedPriceMessage,
            activityType,
            priceChangeId: variantPrice.prices[0].custom.fields[priceAttributeNames.PRICE_CHANGE_ID],
          }
          const actions = getActionsForVariantPrice(parsedPriceMessage, variantPrice);
  
          baseExpectedAction.price.custom.fields[priceAttributeNames.PRICE_CHANGE_ID] = parsedPriceMessage.priceChangeId
          const expectedActions = [{
            ...baseExpectedAction,
            action: 'changePrice',
            priceId: variantPrice.prices[0].id
          }]
          expect(actions).toEqual(expectedActions);
        });
      });
    });

    describe('and it is up to date i.e. newer than the incoming price message', () => {
      it('returns no actions', () => {
        const priceChangeId = 'price-change-id';
        const variantPrice = {
          prices: [{
            custom: {
              fields: {
                [priceAttributeNames.PRICE_CHANGE_ID]: priceChangeId,
                [priceAttributeNames.PROCESS_DATE_CREATED]: '2020-01-02'
              }
            }
          }]
        };
        const parsedPriceMessage = {
          priceChangeId: priceChangeId,
          processDateCreated: new Date('2020-01-01')
        };
        const actions = getActionsForVariantPrice(parsedPriceMessage, variantPrice);
        expect(actions).toEqual([])
      });
    });
  });
});

describe('testStubs; documenting test cases', () => {
  it('if can\'t find the style make a dummy style', () => {});
  it('if processDateCreated is in the future perform a corresponding price update/add/delete in CT', () => {});
  it('if inbound price message has activity type A or C and priceChangeId does not exist, create the price for all variants', () => {});
  it('if inbound price message has activity type A or C and priceChangeId does exist, update the price with the same priceChangeId for all variants', () => {});
  it('if inbound price message has activity type D and priceChangeId does exist, delete the price with the same priceChangeId for all variants', () => {});
  it('if inbound price message has activity type D and priceChangeId does not exist, fail the message to send to retry; means the messages must have come out of order and the next retry should work', () => {});
  it('if inbound price message has activity type of neither A,C, or D then ignore the message as it not valid', () => {});
});
