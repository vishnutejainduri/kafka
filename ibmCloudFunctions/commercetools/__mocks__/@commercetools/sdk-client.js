const mockPrice = {
  country: 'CA',
  value: {
      type: 'centPrecision',
      currencyCode: 'CAD',
      centAmount: 20199,
      fractionDigits: 2
  },
  id: '9e194fab-2c79-4bdf-a990-dc344c8c1f63',
  custom: {
      type: {
          typeId: 'type',
          id: 'af9c14ac-6b56-48d4-b152-2b751d2c9c24'
      },
      fields: {
          priceType: 'originalPrice'
      }
  }
};

const mockSku = {
  sku: '1',
  attributes: [],
  prices: [mockPrice],
  images: [{
    url: 'url',
    dimensions: { 'w':0, 'h':0 }
  }]
};

const mockOrder = {
  id: '1',
  orderNumber: '67897',
  version: 1,
  lineItems: [{
    id: 'id',
    quantity: 1,
    state: [{
      state: {
        id: 'stateId'
      }
    }],
    custom: {
      fields: {
        orderDetailLastModifiedDate: '1995-12-28T15:23:49.002Z',
        barcodeData: [{
          obj: {
            value: {
              barcode: 'barcode'
            }
          }
        }]
      }
    }
  }]
};

const ctMockResponse = {
  version: 1,
  masterData: {
    current: {
      variants: [mockSku],
      masterVariant: {
        attributes: [{
          name: 'originalPrice',
          value: {
            centAmount: 5000
          }
        }],
        prices: [mockPrice]
      }
    },
    staged: {
      variants: [],
      masterVariant: {
        attributes: [mockSku],
        prices: [mockPrice]
      }
    },
    published: true
  },
  //this is a mock for product type onwards actually
  attributes: [{
    name: 'isOnlineSale',
    type: {
      name: 'text'
    }
  },
  {
    name: 'onlineSalePrice',
    type: {
      name: 'money'
    }
  },
  {
    name: 'onlineDiscount',
    type: {
      name: 'text'
    }
  }],
  // mock for any where requests for orders
  results: [mockOrder],
};


const mockUpdateFn = jest.fn();

const categoryResponsePrototype = {
  "id": "8f1b6d78-c29d-46cf-88fe-5bd935e49fd9",
  "version": 1,
  "lastMessageSequenceNumber": 1,
  "createdAt": "2020-04-20T19:57:34.586Z",
  "lastModifiedAt": "2020-04-20T19:57:34.586Z",
  "lastModifiedBy": {
    "clientId": "9YnDCNDg16EER7mWlMjXeHkF",
    "isPlatformClient": false
  },
  "createdBy": {
    "clientId": "9YnDCNDg16EER7mWlMjXeHkF",
    "isPlatformClient": false
  },
  "key": "DPMROOTCATEGORY",
  "name": {
    "en-CA": "DPM ROOT CATEGORY",
    "fr-CA": "DPM ROOT CATEGORY"
  },
  "slug": {
    "en-CA": "DPMROOTCATEGORY",
    "fr-CA": "DPMROOTCATEGORY"
  },
  "ancestors": [],
  "orderHint": "0.00001587412654585211010057",
  "assets": []
};

const responses = {
  'GET-category_en': () => { return {
    ...categoryResponsePrototype,
    key: 'category_en',
    name: {
      'en-CA': 'category_en',
      'fr-CA': 'category_fr'
    }
  } },
  'GET-DPMROOTCATEGORY': () => categoryResponsePrototype,
  'GET-DPMROOTCATEGORY-l1category_en': () => { return {
    ...categoryResponsePrototype,
    key: 'DPMROOTCATEGORY-l1category_en',
    name: {
      'en-CA': 'category_en',
      'fr-CA': 'category_fr'
    }
  } },
  'GET-DPMROOTCATEGORY-l1category_en-l2categoryLevel1A_en': () => { return {
    ...categoryResponsePrototype,
    key: 'DPMROOTCATEGORY-l1category_en-l2categoryLevel1A_en',
    name: {
      'en-CA': 'categoryLevel1A_en',
      'fr-CA': 'categoryLevel1A_fr'
    }
  } },
  'GET-DPMROOTCATEGORY-l1category_en-l2categoryLevel1A_en-l3categoryLevel2A_en': () => { return {
    ...categoryResponsePrototype,
    key: 'DPMROOTCATEGORY-l1category_en-l2categoryLevel1A_en-l3categoryLevel2A_en',
    name: {
      'en-CA': 'categoryLevel2A_en',
      'fr-CA': 'categoryLevel2A_fr'
    }
  } },
  'GET-DPMROOTCATEGORY-l1category_en-l2categoryLevel1A_en-l3new_category_en': () => null,
  'GET-BRANDS': () => { return {
    ...categoryResponsePrototype,
    key: 'BRANDS',
    name: {
      'en-CA': 'BRANDS',
      'fr-CA': 'BRANDS' 
    }
  } },
  'GET-BRANDS-l1brandNameEng': () => { return {
    ...categoryResponsePrototype,
    key: 'BRANDS-l1brandNameEng',
    name: {
      'en-CA': 'brandNameEng',
      'fr-CA': 'brandNameEng'
    }
  } },
  'GET-BRANDS-l1updated_brand_name_en': () => null,
  'POST-DPMROOTCATEGORY-l1category_en-l2categoryLevel1A_en': (...args) => {
    mockUpdateFn(...args);
    return {
      ...categoryResponsePrototype,
      key: 'DPMROOTCATEGORY-l1category_en-l2categoryLevel1A_en',
      name: {
        'en-CA': 'categoryLevel1A_en',
        'fr-CA': 'updated_fr_value'
      }
    }
  },
  'BRANDS-l1updated_brand_name_en': (...args) => {
    mockUpdateFn(...args);
    return {
      ...categoryResponsePrototype,
      key: 'BRANDS-l1updated_brand_name_en',
      name: {
        'en-CA': 'updated_brand_name_en',
        'fr-CA': 'updated_brand_name_en'
      }
    }
  }
};

const mockClient = {
  execute: (config) => {
    if (config) {
      const { method, uri, body } = config;

      if (responses[`${method}-${uri}`]) return { body: responses[`${method}-${uri}`](method, uri, body) };

      // record other update calls
      if (method === 'POST') mockUpdateFn(method, uri, body);
    }

    return ({ body: { ...ctMockResponse, value: { lastModifiedDate: '1970-01-01T00:00:00.050Z' } }});
  },
  mocks: {
    mockUpdateFn
  }
};

const sdkClient = {
  createClient: () => mockClient
};

module.exports = sdkClient;
