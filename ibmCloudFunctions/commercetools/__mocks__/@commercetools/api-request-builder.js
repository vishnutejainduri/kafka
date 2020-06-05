const mockRequestBuilder = {
  orders: {
    where: () => mockRequestBuilder.orders,
    expand: () => mockRequestBuilder.orders,
    byId: () => mockRequestBuilder.orders,
    build: () => mockRequestBuilder.orders
  },
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
    byKey: (categoryKey) => { return { build: () => categoryKey  } },
    build: () => 'category'
  },
};

const requestBuilder = {
  createRequestBuilder: () => mockRequestBuilder
};

module.exports = requestBuilder;
