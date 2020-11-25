const mockCategory = {
  typeId: 'category',
  id: '5bb79326-16ea-40f5-8857-31a020800a1c',
  obj: {
    parent: {
      obj: {
        key: 'DPM_ROOT_CATEGORY'
      }
    }
  }
};
const mockMicrositeCategory = {
  typeId: 'category',
  id: '1ea2fe42-d3fb-4329-a3f2-da6208814aeb',
  obj: {
    parent: {
      obj: {
        key: 'MICROSITES' 
      }
    }
  }
};

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

const mockOrderLineItem = {
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
};

const mockOrder = {
  id: '1',
  orderNumber: '67897',
  version: 1,
  lineItems: [mockOrderLineItem]
};

const ctMockResponse = {
  version: 1,
  masterData: {
    current: {
      categories: [mockCategory, mockMicrositeCategory],
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
      categories: [mockCategory, mockMicrositeCategory],
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
  'GET-MICROSITES': () => { return {
    ...categoryResponsePrototype,
    key: 'MICROSITES',
    name: {
      'en-CA': 'MICROSITES',
      'fr-CA': 'MICROSITES'
    }
  } },
  'GET-facetid_57': () => { return {
    ...categoryResponsePrototype,
    id: '1ea2fe42-d3fb-4329-a3f2-da6208814aeb',
    key: 'facetid_57',
    name: {
      'en-CA': 'microsite_en',
      'fr-CA': 'microsite_fr'
    }
  } },
  'GET-facetid_58': () => null,
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
  },
  'POST-facetid_57': (...args) => {
    mockUpdateFn(...args);
    return {
      ...categoryResponsePrototype,
      key: 'facetid_57',
      name: {
        'en-CA': 'updated_microsite_en',
        'fr-CA': 'updated_microsite_fr'
      }
    }
  },
  'POST-categoryfacetid_58': (...args) => {
    mockUpdateFn(...args);
    return {
      ...categoryResponsePrototype,
      key: 'facetid_58',
      name: {
        'en-CA': 'updated_microsite_en',
        'fr-CA': 'updated_microsite_fr'
      }
    }
  }
};

const mockClient = {
  execute: (config) => {
    if (config) {
      const { method, uri, body } = config;

      if (body) {
        const key = JSON.parse(body).key || ''
        if (responses[`${method}-${uri}${key}`]) return { body: responses[`${method}-${uri}${key}`](method, uri, body) };
      } else if (responses[`${method}-${uri}`]) return { body: responses[`${method}-${uri}`](method, uri, body) };

      // record other update calls
      if (method === 'POST') mockUpdateFn(method, uri, body);
    }

    return ({ body: { ...ctMockResponse, value: { lastModifiedDate: '1970-01-01T00:00:00.050Z' } }, catch: () => {} });
  },
  mocks: {
    mockUpdateFn
  }
};

const sdkClient = {
  createClient: () => mockClient
};

module.exports = sdkClient;
