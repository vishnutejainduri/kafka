const fs = require('fs');
const { createSyncProducts } = require('@commercetools/sync-actions');
const syncProducts = createSyncProducts()

const wstreamError = fs.createWriteStream('errors.csv');

const deletePrices = (product) => {
  product.masterData.current.masterVariant.prices = [];
  product.masterData.current.variants.map(currentVariant => {
    currentVariant.prices = [];
    return currentVariant;
  })
  return product;
}

const whereHasPrice = `masterData(current(masterVariant(prices is not empty))) or masterData(current(variants(prices is not empty)))`

const deleteProductData = async ({ client, requestBuilder }, { priceDeleter }, { whereQuery }) => {
  const method = 'GET';

  let productTotal = 0;
  let totalFailures = 0;
  let totalSuccess = 0;

  let lastId = null;
  let resultCount = 500;
  
  while (resultCount === 500) {
    let uri;
    if (!lastId) {
      uri = requestBuilder.products.withTotal(false).perPage(500).sort('id').where(whereQuery).build();
    } else {
      uri = requestBuilder.products.withTotal(false).perPage(500).sort('id').where(`id > "${lastId}" and ` + whereQuery).build();
      //break;
    }

    try {
      const response = await client.execute({ method, uri });

      resultCount = response.body.count;
      productTotal += resultCount;
      console.log('Total products: ', productTotal);
      const results = response.body.results;

      await Promise.all(results.map ((result) => {
        const productBefore = result;
        let productAfter = JSON.parse(JSON.stringify(productBefore));

        if (priceDeleter) productAfter = priceDeleter(productAfter);
        //console.log('productAfter', productAfter.masterData.current)
        //console.log('productBefore', productBefore.masterData.current)

        let actions = syncProducts.buildActions(productAfter.masterData.current, productBefore.masterData.current);
        actions = actions.map(action => {
          action['isStaged'] = false
          return action;
        });
        //console.log('actions', actions);
        const uri = requestBuilder.products.byKey(productBefore.key).build();
        //console.log('productBefore.key', productBefore.key);
        const body = JSON.stringify({ version: productBefore.version, actions });

        return client.execute({ method: 'POST', uri, body })
          .then(result => {
            //console.log('result', result.body.version, 'productBefore.version', productBefore.version);
            const uri = requestBuilder.products.byKey(result.body.key).build();
            const body = JSON.stringify({ version: result.body.version, actions: [{ action: 'publish', scope: 'All' }] });

            return client.execute({ method: 'POST', uri, body })
              .then(publishResult => totalSuccess += 1)
              .catch(error => {
                console.error(error.message);
                wstreamError.write(result.body.key + ',' + error.message + '\n');
                totalFailures += 1;
              })
          })
          .catch(error => {
            console.error(error.message);
            wstreamError.write(productBefore.key + ',' + error.message + '\n');
            totalFailures += 1;
          })
      }));

      lastId = results[results.length-1].id;
    } catch (err) {
        if (err.code === 404) return null;
        throw err;
    }
  }
  return {
    productTotal,
    totalSuccess,
    totalFailures
  };
}

const deleteAllPrices = (ctHelpers) => deleteProductData(ctHelpers, { priceDeleter: deletePrices }, { whereQuery: whereHasPrice })

module.exports = {
  deleteAllPrices
}
