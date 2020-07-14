const fs = require('fs');
const { createSyncProducts } = require('@commercetools/sync-actions');
const syncProducts = createSyncProducts()

let totalFailures = 0;
let totalSuccess = 0;

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

const sendUpdateActions = ({ client, requestBuilder }, actions, productBefore) => {
  if (actions.length === 0) return null;
  const uri = requestBuilder.products.byKey(productBefore.key).build();
  const body = JSON.stringify({ version: productBefore.version, actions });

  return client.execute({ method: 'POST', uri, body })
    .then(result => {
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
}

const deleteProductData = async (ctHelpers, { priceDeleter }, whereQuery) => {
  const method = 'GET';

  let productTotal = 0;

  let lastId = null;
  let resultCount = 500;

  const { client, requestBuilder } = ctHelpers;
  
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

      let syncActions = results.map ((result) => {
        const productBefore = result;
        let productAfter = JSON.parse(JSON.stringify(productBefore));

        if (priceDeleter) productAfter = priceDeleter(productAfter);

        const actions = syncProducts.buildActions(productAfter.masterData.current, productBefore.masterData.current);
        const groupedActionPromises = [];
        let groupedActions = [];
        actions.forEach((action, index) => {
          groupedActions.push(action);
          if ((index+1) % 500 === 0) { //send every 500 actions
            groupedActionPromises.push(sendUpdateActions(ctHelpers, groupedActions, productBefore));
            groupedActions = [];
          } else if (index === actions.length-1) { //end of actions, send remainder
            groupedActionPromises.push(sendUpdateActions(ctHelpers, groupedActions, productBefore));
            groupedActions = [];
          }
        });
        return groupedActionPromises;
      });

      syncActions = syncActions.reduce((finalActions, currentActions) => [...finalActions, ...currentActions], []).filter(action => action);
      await Promise.all (syncActions)
        .catch(error => {
          console.error(error);
          wstreamError.write(results + ',' + error + '\n');
          totalFailures += syncActions.length;
        })

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

const deleteAllPrices = (ctHelpers) => deleteProductData(ctHelpers, { priceDeleter: deletePrices }, whereHasPrice)

module.exports = {
  deleteAllPrices
}
