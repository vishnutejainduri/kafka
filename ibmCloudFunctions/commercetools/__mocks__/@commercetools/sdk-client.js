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
  execute: () => ({ body: ctProduct })
};

const sdkClient = {
  createClient: () => mockClient
};

module.exports = sdkClient;
