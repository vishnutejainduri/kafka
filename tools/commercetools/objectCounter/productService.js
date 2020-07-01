const getAllVariantsCount = async ({ client, requestBuilder }) => {
  const method = 'GET';

  const uri = requestBuilder.products.build();

  try {
    const response = await client.execute({ method, uri });
    const results = response.body.results;
    console.log('Total products: ', results.length);

    let variantTotal = 0;
    results.forEach ((result) => variantTotal += result.masterData.current.variants.length )
    return variantTotal;
  } catch (err) {
      if (err.code === 404) return null;
      throw err;
  }
}

module.exports.getAllVariantsCount = getAllVariantsCount;
