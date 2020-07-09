const countImage = (result) => result.masterData.current.variants.reduce((totalImages, currentVariant) => (totalImages += currentVariant.images.length), 0 )
const countBarcodes = (result) => {
  return result.masterData.current.variants.reduce((totalBarcodes, currentVariant) => {
    const barcodeAttribute = currentVariant.attributes.filter((attribute) => attribute.name === 'barcodes')[0];
    return totalBarcodes += barcodeAttribute ? barcodeAttribute.value.length : 0
  }, 0)
}
const countVariants = (result) => result.masterData.current.variants.length

const getAllVariantAttributeCount = async ({ client, requestBuilder }, counterFunction) => {
  const method = 'GET';

  let total = 0;
  let productTotal = 0;
  let lastId = null;
  let resultCount = 500;
  
  while (resultCount === 500) {
    let uri;
    if (!lastId) {
      uri = requestBuilder.products.withTotal(false).perPage(500).sort('id').build();
    } else {
      uri = requestBuilder.products.withTotal(false).perPage(500).sort('id').where(`id > "${lastId}"`).build();
    }

    try {
      const response = await client.execute({ method, uri });

      resultCount = response.body.count;
      productTotal += resultCount;
      console.log('Total products: ', productTotal);

      const results = response.body.results;
      results.forEach ((result) => total += counterFunction(result))
      console.log('Total : ', total);
      lastId = results[results.length-1].id;
    } catch (err) {
        if (err.code === 404) return null;
        throw err;
    }
  }
  return total;
}

const getAllVariantsCount = (ctHelpers) => getAllVariantAttributeCount(ctHelpers, countVariants)
const getAllImagesCount = (ctHelpers) => getAllVariantAttributeCount(ctHelpers, countImage)
const getAllBarcodesCount = (ctHelpers) => getAllVariantAttributeCount(ctHelpers, countBarcodes)

module.exports = {
  getAllVariantsCount,
  getAllImagesCount,
  getAllBarcodesCount
}
