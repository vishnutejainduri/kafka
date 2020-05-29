const { createClient } = require('@commercetools/sdk-client');

const consumeSalePriceCT = require('..');
const getCtHelpers = require('../../../lib/commercetoolsSdk');
const { updateStyleSalePrice, getAllVariantPrices, getExistingCtOriginalPrice, getActionsForVariantPrice, getActionsForSalePrice } = require('../utils');
const {
    validateSalePriceMessages,
    passOnlinePriceMessages,
    parseSalePriceMessage
} = require('../../../lib/parseSalePriceMessage');

const {
  addErrorHandling,
} = require('../../../product-consumers/utils');
const { priceAttributeNames, isStaged } = require('../../constantsCt');

const { priceActivityTypes } = require('../../../constants');

jest.mock('@commercetools/sdk-client');
jest.mock('@commercetools/api-request-builder');
jest.mock('@commercetools/sdk-middleware-auth');
jest.mock('@commercetools/sdk-middleware-http');
jest.mock('node-fetch');

const validMessage = {
  topic: 'sale-prices-connect-jdbc',
  value: {
    STYLE_ID: 'styleId',
    PRICE_CHANGE_ID: 'priceChangeId',
    START_DATE: 1000000000000,
    END_DATE: 1000000000000,
    ACTIVITY_TYPE: priceActivityTypes.APPROVED,
    PROCESS_DATE_CREATED: 1000000000000,
    NEW_RETAIL_PRICE: 'newRetailPrice',
    SITE_ID: '00990'
  }
};

const validParams = {
  topicName: 'sale-prices-connect-jdbc',
  ctpProjectKey: 'key',
  ctpClientId: 'id',
  ctpClientSecret: 'secret',
  ctpAuthUrl: 'authUrl',
  ctpApiUrl: 'apiUrl',
  ctpScopes: 'manage_products:harryrosen-dev',
  productTypeId: 'product-type-reference-id',
  messages: [validMessage]
};

const mockProduct = createClient().execute().body;
const mockedCtHelpers = getCtHelpers(validParams);

describe('consumeSalePriceCT', () => {
  it('missing params; throw error', () => {
    return expect(consumeSalePriceCT({})).rejects.toThrow();
  });

  it('returns expected success result for correct params and a valid message', async () => {
    const response = await consumeSalePriceCT(validParams);
    return expect(response).toEqual({
      successCount: 1,
      failureIndexes: [],
      errors: []
    });
  });

  it('returns expected ignored result for correct params and a message that should be ignored', async () => {
    // site ID is not 09900
    const messageToBeIgnored = {
      ...validMessage,
      value: {
        ...validMessage.value,
        SITE_ID: '00110'
      }
    };
    const response = await consumeSalePriceCT({
      ...validParams,
      messages: [messageToBeIgnored]
    });
    return expect(response).toEqual({
      successCount: 0,
      errorCount: 0,
      ignoredCount: 1,
      ignoredIndexes: [0],
      failureIndexes: [],
      errors: []
    });
  });

  it('returns mixed error/success result for correct params and valid message and an invalid message', async () => {
    // missing topic
    const invalidMessage = { id: 'invalid_message' }; 
    const response = await consumeSalePriceCT({
      ...validParams,
      messages:[
        validMessage,
        invalidMessage
      ]
    });
    const error = new Error('Can only parse Sale Price update messages');
    return expect(response).toEqual({
      successCount: 1,
      failureIndexes: [1],
      errors: [{
        failureIndex: 1,
        error
      }]
    });
  });
});

describe('updateStyleSalePrice', () => {
  it('runs without throwing an error for approve "A" action', async () => {
     const pricesToUpdate =
        validParams.messages
        .map(addErrorHandling(validateSalePriceMessages))
        .map(addErrorHandling(passOnlinePriceMessages))
        .map(addErrorHandling(parseSalePriceMessage))

    await updateStyleSalePrice(mockedCtHelpers, validParams.productTypeId, pricesToUpdate[0]);
  });
  it('runs without throwing an error for create "C" action', async () => {
     validParams.messages[0].value.ACTIVITY_TYPE = priceActivityTypes.CREATED;
     const result =  
        validParams.messages
        .map(addErrorHandling(validateSalePriceMessages))
        .map(addErrorHandling(passOnlinePriceMessages))
        .map(addErrorHandling(parseSalePriceMessage))

    await updateStyleSalePrice(mockedCtHelpers, validParams.productTypeId, result[0]);
  });
  it('should throw an error of trying to delete "D" a price that does not exist', async () => {
     validParams.messages[0].value.ACTIVITY_TYPE = priceActivityTypes.DELETED;
     const result =  
        validParams.messages
        .map(addErrorHandling(validateSalePriceMessages))
        .map(addErrorHandling(passOnlinePriceMessages))
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

describe('action generation', () => {
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
  
  describe('getActionsForVariantPrice', () => {
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
  
    describe('No update is required i.e. there is an existing data and it is newer than the incoming price message', () => {
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
  
    describe('An update is requird i.e. there is no existing data or it is older than the incoming price message', () => {  
      describe('There is no existing price', () => {
        it('returns an "add price" action for activity types approve "A" and create "C"', () => {
          const activityTypes = [priceActivityTypes.APPROVED, priceActivityTypes.CREATED];
          activityTypes.forEach(activityType => {
            const parsedPriceMessage = {
              ...baseParsedPriceMessage,
              activityType,
              priceChangeId: 'different-from' + variantPrice.prices[0].custom.fields[priceAttributeNames.PRICE_CHANGE_ID],
            };
            const actions = getActionsForVariantPrice(parsedPriceMessage, variantPrice);
    
            baseExpectedAction.price.custom.fields[priceAttributeNames.PRICE_CHANGE_ID] = parsedPriceMessage.priceChangeId
            const expectedActions = [{
              ...baseExpectedAction,
              action: 'addPrice',
              variantId: variantPrice.variantId
            }];
            expect(actions).toEqual(expectedActions);
          });
        });
    
        it('throws an error for activity type delete "D"', () => {
          const parsedPriceMessage = {
            ...baseParsedPriceMessage,
            activityType: priceActivityTypes.DELETED,
            priceChangeId: 'different-from' + variantPrice.prices[0].custom.fields[priceAttributeNames.PRICE_CHANGE_ID],
          }
          expect(() => getActionsForVariantPrice(parsedPriceMessage, variantPrice)).toThrow(new Error ('Price does not exist'));
        });

        describe('The activity type is not recognized', () => {
          it('throws an error', () => {
            const parsedPriceMessage = {
              ...baseParsedPriceMessage,
              activityType: 'DoesNotExist'
            };
            expect(() => getActionsForVariantPrice(parsedPriceMessage, variantPrice)).toThrow(new Error (`Activity type ${parsedPriceMessage.activityType} is not recognized!`));
          });
        });
      });
    
      describe('There is an existing price', () => {
        describe('and it is outdated i.e. older than the incoming price message', () => {
          it('returns a "change price" action for activity types approve "A" and create "C"', () => {
            const activityTypes = [priceActivityTypes.APPROVED, priceActivityTypes.CREATED];
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
    
          it('returns a "delete" action for activity types delete "D"', () => {
            const parsedPriceMessage = {
              ...baseParsedPriceMessage,
              activityType: priceActivityTypes.DELETED,
              priceChangeId: variantPrice.prices[0].custom.fields[priceAttributeNames.PRICE_CHANGE_ID],
            };
            const actions = getActionsForVariantPrice(parsedPriceMessage, variantPrice);
            const expectedActions = [{
              action: 'removePrice',
              priceId: variantPrice.prices[0].id
            }];
            expect(actions).toEqual(expectedActions);
          });
        });
      });
    });
  });
  
  describe('getActionsForSalePrice', () => {
    it('flatmaps the nested arrays of actions into one flat array of actions', () => {
      const parsedPriceMessage = {
        ...baseParsedPriceMessage,
        activityType: priceActivityTypes.APPROVED,
        priceChangeId: 'different-from' + variantPrice.prices[0].custom.fields[priceAttributeNames.PRICE_CHANGE_ID],
      }; 
      const allActions = getActionsForSalePrice(parsedPriceMessage,[variantPrice, variantPrice]);
      expect(allActions.length).toEqual(2);
    });
  });
});

describe('testStubs; documenting test cases', () => {
  it('if can\'t find the style make a dummy style', () => {});
  it('if only a number of the messages fail, the whole function succeeds and it returns the failureIndexes', () => {});
});
