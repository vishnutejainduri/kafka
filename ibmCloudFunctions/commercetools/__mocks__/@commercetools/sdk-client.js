const ctProduct = {
  version: 1,
  masterData: {
    current: {
      variants: [],
      masterVariant: {
        attributes: [],
        prices: []
      }
    },
    staged: {
      variants: [],
      masterVariant: {
        attributes: [],
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
  execute: () => ({ body: ctProduct })
};

const sdkClient = {
  createClient: () => mockClient
};

module.exports = sdkClient;
