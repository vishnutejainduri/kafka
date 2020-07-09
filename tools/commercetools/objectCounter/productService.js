const countImage = (result) => result.masterData.current.variants.reduce((totalImages, currentVariant) => (totalImages += currentVariant.images.length), 0 )
const countBarcodes = (result) => {
  return result.masterData.current.variants.reduce((totalBarcodes, currentVariant) => {
    const barcodeAttribute = currentVariant.attributes.filter((attribute) => attribute.name === 'barcodes')[0];
    return totalBarcodes += barcodeAttribute ? barcodeAttribute.value.length : 0
  }, 0)
}
const countVariants = (result) => result.masterData.current.variants.length

const getAllVariantAttributeCount = async ({ client, requestBuilder }, { variantCounter, imageCounter, barcodeCounter }) => {
  const method = 'GET';

  let variantTotal = 0;
  let imageTotal = 0;
  let barcodeTotal = 0;
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
      results.forEach ((result) => {
        if (variantCounter) variantTotal += variantCounter(result)
        if (imageCounter) imageTotal += imageCounter(result);
        if (barcodeCounter) barcodeTotal += barcodeCounter(result);
      });

      if (variantCounter) console.log('Total Variants : ', variantTotal);
      if (imageCounter) console.log('Total Images : ', imageTotal);
      if (barcodeCounter) console.log('Total Barcodes : ', barcodeTotal);

      lastId = results[results.length-1].id;
    } catch (err) {
        if (err.code === 404) return null;
        throw err;
    }
  }
  return {
    productTotal,
    variantTotal,
    imageTotal,
    barcodeTotal
  };
}

const getAllVariantsCount = (ctHelpers) => getAllVariantAttributeCount(ctHelpers, { variantCounter: countVariants })
const getAllImagesCount = (ctHelpers) => getAllVariantAttributeCount(ctHelpers, { imageCounter: countImage })
const getAllBarcodesCount = (ctHelpers) => getAllVariantAttributeCount(ctHelpers, { barcodeCounter: countBarcodes })
const getAllCount = (ctHelpers) => getAllVariantAttributeCount(ctHelpers, { variantCounter: countVariants, imageCounter: countImage, barcodeCounter: countBarcodes })

module.exports = {
  getAllVariantsCount,
  getAllImagesCount,
  getAllBarcodesCount,
  getAllCount
}
