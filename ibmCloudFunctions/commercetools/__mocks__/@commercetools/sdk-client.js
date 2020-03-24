const mockClient = {
  execute: () => ({ body: {
    version: 1,
    masterData: {
      'staged': {
        masterVariant: {
          attributes: [],
          prices: []
        },
        variants: []
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
  }})
};

const sdkClient = {
  createClient: () => mockClient
};

module.exports = sdkClient;
