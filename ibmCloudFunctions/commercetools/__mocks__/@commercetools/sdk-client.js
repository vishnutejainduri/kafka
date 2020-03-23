const ctProduct = {
  version: 1,
  masterData: {
    current: {
      variants: []
    },
    staged: {
      variants: []
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
