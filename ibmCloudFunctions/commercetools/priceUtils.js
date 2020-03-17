const { getStyle } = require('./styleUtils');

const shouldUpdatePrice = async (ctHelpers, productTypeId, styleId) => {
    const currentProduct = await getStyle(styleId, ctHelpers);

    if (!currentProduct.version) {
      // the style isn't currently stored in CT, so we can't update price at the moment, it will rerun from kafka later
      return null;
    } else {
      return currentProduct;
    }
};

module.exports = {
  shouldUpdatePrice
};
