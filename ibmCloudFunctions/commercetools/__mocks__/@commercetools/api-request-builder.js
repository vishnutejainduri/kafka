const mockRequestBuilder = {
  products: {
    byKey: () => mockRequestBuilder.products,
    build: () => mockRequestBuilder.products
  },
  customObjects: {
    byKey: () => mockRequestBuilder.customObjects,
    build: () => mockRequestBuilder.customObjects
  }
};

const requestBuilder = {
  createRequestBuilder: () => mockRequestBuilder
};

module.exports = requestBuilder;
