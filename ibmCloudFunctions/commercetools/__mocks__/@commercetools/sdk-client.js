const mockClient = {
  execute: () => ({ body: { version: 1, value: { lastModifiedDate: '1970-01-01T00:00:00.050Z' } } })
};

const sdkClient = {
  createClient: () => mockClient
};

module.exports = sdkClient;
