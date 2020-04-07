const mockRequestBuilder = {
  products: {
    byKey: () => mockRequestBuilder.products,
    build: () => mockRequestBuilder.products
  },
  customObjects: {
    byKey: () => mockRequestBuilder.customObjects,
    build: () => mockRequestBuilder.customObjects
  },
  productTypes: {
    byKey: () => mockRequestBuilder.productTypes,
    byId: () => mockRequestBuilder.productTypes,
    build: () => mockRequestBuilder.productTypes
  },
  categories: {
    byKey: () => mockRequestBuilder.categories,
    build: () => mockRequestBuilder.categories
  },
};

const requestBuilder = {
  createRequestBuilder: () => mockRequestBuilder
};

module.exports = requestBuilder;
