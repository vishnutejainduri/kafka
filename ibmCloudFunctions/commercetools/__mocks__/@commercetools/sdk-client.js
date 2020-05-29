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
          isOriginalPrice: true
      }
  }
};

const mockSku = {
  sku: '1',
  attributes: [],
  prices: [mockPrice]
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
        attributes: [],
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

const mockClient = {
  execute: () => ({ body: { ...ctMockResponse, value: { lastModifiedDate: '1970-01-01T00:00:00.050Z' } }})
};

const sdkClient = {
  createClient: () => mockClient
};

module.exports = sdkClient;
