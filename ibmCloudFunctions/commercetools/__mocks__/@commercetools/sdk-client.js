const ctProduct = {
  version: 1,
  masterData: {
    current: {
      variants: [],
      masterVariant: {
        attributes: []
      }
    },
    staged: {
      variants: [],
      masterVariant: {
        attributes: []
      }
    }
  }
};

const mockClient = {
  execute: () => ({ body: { ...ctProduct, value: { lastModifiedDate: '1970-01-01T00:00:00.050Z' } }})
};

const sdkClient = {
  createClient: () => mockClient
};

module.exports = sdkClient;
