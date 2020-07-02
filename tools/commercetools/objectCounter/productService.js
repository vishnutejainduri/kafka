const getAllVariantsCount = async ({ client, requestBuilder }) => {
  const method = 'GET';

  let variantTotal = 0;
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
      results.forEach ((result) => variantTotal += result.masterData.current.variants.length )
      console.log('Total variants: ', variantTotal);
      lastId = results[results.length-1].id;
    } catch (err) {
        if (err.code === 404) return null;
        throw err;
    }
  }
  return variantTotal;
}

module.exports.getAllVariantsCount = getAllVariantsCount;
