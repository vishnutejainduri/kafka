const mockClient = {
  execute: () => ({ body: { version: 1 } })
};

const sdkClient = {
  createClient: () => mockClient
};

module.exports = sdkClient;
