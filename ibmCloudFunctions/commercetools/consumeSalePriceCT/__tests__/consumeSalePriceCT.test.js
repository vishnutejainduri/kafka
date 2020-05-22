const getCtHelpers = require('../../../lib/commercetoolsSdk');
const consumeSalePriceCT = require('..');
const { updateStyleSalePrice, getAllVariantPrices, getExistingCtOriginalPrice, getCustomFieldActionForSalePrice } = require('../utils');
const {
    filterSalePriceMessages,
    parseSalePriceMessage
} = require('../../../lib/parseSalePriceMessage');
const {
  addErrorHandling,
} = require('../../../product-consumers/utils');
const { createClient } = require('@commercetools/sdk-client');

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
  it('should add a price', async () => {
     const result =  
        validParams.messages
        .filter(addErrorHandling(filterSalePriceMessages))
        .map(addErrorHandling(parseSalePriceMessage))

    const response = await updateStyleSalePrice(mockedCtHelpers, validParams.productTypeId, result[0]);
    const expectedResponse = {
      "body": {
        "attributes": [{
          "name": "isOnlineSale",
          "type": {
            "name": "text"
          }
        }, {
          "name": "onlineSalePrice",
          "type": {
            "name": "money"
          }
        }, {
          "name": "onlineDiscount",
          "type": {
            "name": "text"
          }
        }],
        "masterData": {
          published: true,
          "current": {
            "masterVariant": {
              "attributes": [],
              "prices": [{
                "custom": {
                  "fields": {
                    "isOriginalPrice": true
                  },
                  "type": {
                    "id": "af9c14ac-6b56-48d4-b152-2b751d2c9c24",
                    "typeId": "type"
                  }
                },
                "id": "9e194fab-2c79-4bdf-a990-dc344c8c1f63",
                "value": {
                  "centAmount": 20199,
                  "currencyCode": "CAD",
                  "fractionDigits": 2,
                  "type": "centPrecision"
                }
              }]
            },
            "variants": [{
              "attributes": [],
              "prices": [{
                "custom": {
                  "fields": {
                    "isOriginalPrice": true
                  },
                  "type": {
                    "id": "af9c14ac-6b56-48d4-b152-2b751d2c9c24",
                    "typeId": "type"
                  }
                },
                "id": "9e194fab-2c79-4bdf-a990-dc344c8c1f63",
                "value": {
                  "centAmount": 20199,
                  "currencyCode": "CAD",
                  "fractionDigits": 2,
                  "type": "centPrecision"
                }
              }],
              "sku": "1"
            }]
          },
          "staged": {
            "masterVariant": {
              "attributes": [{
                "attributes": [],
                "prices": [{
                  "custom": {
                    "fields": {
                      "isOriginalPrice": true
                    },
                    "type": {
                      typeId: 'type',
                      id: 'af9c14ac-6b56-48d4-b152-2b751d2c9c24'
                    }
                  },
                  "id": "9e194fab-2c79-4bdf-a990-dc344c8c1f63",
                  "value": {
                    "centAmount": 20199,
                    "currencyCode": "CAD",
                    "fractionDigits": 2,
                    "type": "centPrecision"
                  }
                }],
                "sku": "1"
              }],
              "prices": [{
                "custom": {
                  "fields": {
                    "isOriginalPrice": true
                  },
                  "type": {
                    "id": "af9c14ac-6b56-48d4-b152-2b751d2c9c24",
                    "typeId": "type"
                  }
                },
                "id": "9e194fab-2c79-4bdf-a990-dc344c8c1f63",
                "value": {
                  "centAmount": 20199,
                  "currencyCode": "CAD",
                  "fractionDigits": 2,
                  "type": "centPrecision"
                }
              }]
            },
            "variants": []
          }
        },
        "results": [{
          "id": "1",
          "lineItems": [{
            "custom": {
              "fields": {
                "barcodeData": [{
                  "obj": {
                    "value": {
                      "barcode": "barcode"
                    }
                  }
                }],
                "orderDetailLastModifiedDate": "1995-12-28T15:23:49.002Z"
              }
            },
            "id": "id",
            "quantity": 1,
            "state": [{
              "state": {
                "id": "stateId"
              }
            }]
          }],
          "orderNumber": "67897",
          "version": 1
        }],
        "value": {
          "lastModifiedDate": "1970-01-01T00:00:00.050Z"
        },
        "version": 1
      }
    };

    expect(response).toStrictEqual(expectedResponse);
  });

  it('should update a price; technically no mock price to update but activity type flag test', async () => {
     validParams.messages[0].value.ACTIVITY_TYPE = 'C';
     const result =  
        validParams.messages
        .filter(addErrorHandling(filterSalePriceMessages))
        .map(addErrorHandling(parseSalePriceMessage))

    const response = await updateStyleSalePrice(mockedCtHelpers, validParams.productTypeId, result[0]);
    const expectedResponse = {
      "body": {
        "attributes": [{
          "name": "isOnlineSale",
          "type": {
            "name": "text"
          }
        }, {
          "name": "onlineSalePrice",
          "type": {
            "name": "money"
          }
        }, {
          "name": "onlineDiscount",
          "type": {
            "name": "text"
          }
        }],
        "masterData": {
          published: true,
          "current": {
            "masterVariant": {
              "attributes": [],
              "prices": [{
                "custom": {
                  "fields": {
                    "isOriginalPrice": true
                  },
                  "type": {
                    "id": "af9c14ac-6b56-48d4-b152-2b751d2c9c24",
                    "typeId": "type"
                  }
                },
                "id": "9e194fab-2c79-4bdf-a990-dc344c8c1f63",
                "value": {
                  "centAmount": 20199,
                  "currencyCode": "CAD",
                  "fractionDigits": 2,
                  "type": "centPrecision"
                }
              }]
            },
            "variants": [{
              "attributes": [],
              "prices": [{
                "custom": {
                  "fields": {
                    "isOriginalPrice": true
                  },
                  "type": {
                    "id": "af9c14ac-6b56-48d4-b152-2b751d2c9c24",
                    "typeId": "type"
                  }
                },
                "id": "9e194fab-2c79-4bdf-a990-dc344c8c1f63",
                "value": {
                  "centAmount": 20199,
                  "currencyCode": "CAD",
                  "fractionDigits": 2,
                  "type": "centPrecision"
                }
              }],
              "sku": "1"
            }]
          },
          "staged": {
            "masterVariant": {
              "attributes": [{
                "attributes": [],
                "prices": [{
                  "custom": {
                    "fields": {
                      "isOriginalPrice": true
                    },
                    "type": {
                      typeId: 'type',
                      id: 'af9c14ac-6b56-48d4-b152-2b751d2c9c24'
                    }
                  },
                  "id": "9e194fab-2c79-4bdf-a990-dc344c8c1f63",
                  "value": {
                    "centAmount": 20199,
                    "currencyCode": "CAD",
                    "fractionDigits": 2,
                    "type": "centPrecision"
                  }
                }],
                "sku": "1"
              }],
              "prices": [{
                "custom": {
                  "fields": {
                    "isOriginalPrice": true
                  },
                  "type": {
                    "id": "af9c14ac-6b56-48d4-b152-2b751d2c9c24",
                    "typeId": "type"
                  }
                },
                "id": "9e194fab-2c79-4bdf-a990-dc344c8c1f63",
                "value": {
                  "centAmount": 20199,
                  "currencyCode": "CAD",
                  "fractionDigits": 2,
                  "type": "centPrecision"
                }
              }]
            },
            "variants": []
          }
        },
        "results": [{
          "id": "1",
          "lineItems": [{
            "custom": {
              "fields": {
                "barcodeData": [{
                  "obj": {
                    "value": {
                      "barcode": "barcode"
                    }
                  }
                }],
                "orderDetailLastModifiedDate": "1995-12-28T15:23:49.002Z"
              }
            },
            "id": "id",
            "quantity": 1,
            "state": [{
              "state": {
                "id": "stateId"
              }
            }]
          }],
          "orderNumber": "67897",
          "version": 1
        }],
        "value": {
          "lastModifiedDate": "1970-01-01T00:00:00.050Z"
        },
        "version": 1
      }
    };

    expect(response).toStrictEqual(expectedResponse);
  });
  it('should delete a price; technically no mock price to delete but activity type flag test', async () => {
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

describe('getCustomFieldActionForSalePrice', () => {
  it('get custom field updates for a price record', async () => {
     const result =  
        validParams.messages
        .filter(addErrorHandling(filterSalePriceMessages))
        .map(addErrorHandling(parseSalePriceMessage))

    const response = await getCustomFieldActionForSalePrice(mockProduct.masterData.current.masterVariant.prices[0], result[0]);
    const expectedResponse = {"action": "setProductPriceCustomType", "fields": {"isOriginalPrice": false, "priceChangeId": "priceChangeId", "processDateCreated": new Date("2001-09-09T01:46:40.000Z")}, "priceId": "9e194fab-2c79-4bdf-a990-dc344c8c1f63", "type": {"key": "priceCustomFields"}};

    expect(response).toStrictEqual(expectedResponse);
  });
});

describe('testStubs; documenting test cases', () => {
  it('if can\'t find the style make a dummy style', () => {});
  it('if processDateCreated is in the past do nothing', () => {});
  it('if processDateCreated is in the future perform a corresponding price update/add/delete in CT', () => {});
  it('if inbound price message has activity type A or C and priceChangeId does not exist, create the price for all variants', () => {});
  it('if inbound price message has activity type A or C and priceChangeId does exist, update the price with the same priceChangeId for all variants', () => {});
  it('if inbound price message has activity type D and priceChangeId does exist, delete the price with the same priceChangeId for all variants', () => {});
  it('if inbound price message has activity type D and priceChangeId does not exist, fail the message to send to retry; means the messages must have come out of order and the next retry should work', () => {});
  it('if inbound price message has activity type of neither A,C, or D then ignore the message as it not valid', () => {});
});
