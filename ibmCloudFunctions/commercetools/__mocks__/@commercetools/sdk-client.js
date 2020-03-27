const mockSku = {
  sku: '1',
  attributes: [],
  prices: []
};

const ctProduct = {
  version: 1,
  masterData: {
    current: {
      variants: [mockSku],
      masterVariant: {
        attributes: [],
        prices: []
      }
    },
    staged: {
      variants: [],
      masterVariant: {
        attributes: [mockSku],
        prices: []
      }
    }
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
  }]
};

const mockClient = {
  execute: () => ({ body: { ...ctProduct, value: { lastModifiedDate: '1970-01-01T00:00:00.050Z' } }})
};

const sdkClient = {
  createClient: () => mockClient
};

module.exports = sdkClient;
