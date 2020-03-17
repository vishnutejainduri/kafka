const mockRequestBuilder = {
  products: {
    byKey: () => mockRequestBuilder.products,
    build: () => mockRequestBuilder.products
  }
};

const requestBuilder = {
  createRequestBuilder: () => { console.log('mock active'); return mockRequestBuilder}
};

module.exports = requestBuilder;
