const fs = require('fs');
const { createSyncProducts } = require('@commercetools/sync-actions');
const syncProducts = createSyncProducts()

let totalFailures = 0;
let totalSuccess = 0;

const wstreamError = fs.createWriteStream('errors.csv');
const wstreamOutput = fs.createWriteStream('output.csv');

const whereGetOrder = `custom(fields(sentToOmsStatus != "FAILURE")) and custom(fields(sentToOmsStatus != "SUCCESS")) and custom(fields(loginRadiusUid is defined))`
const whereGetCrm = `custom(fields(sentToCrmStatus = "PENDING" or sentToCrmStatus is not defined)) and custom is defined`

const getAllProducts = async ({ client, requestBuilder }) => {
  const method = 'GET';

  let productTotal = 0;
  let productPrices = []

  let lastId = null;
  let resultCount = 500;
  
  while (resultCount === 500) {
    let uri;
    if (!lastId) {
      uri = requestBuilder.productProjections.parse({ priceCountry: 'CA', priceCurrency: 'CAD' }).withTotal(false).perPage(500).sort('id').build();
      //uri = requestBuilder.products.withTotal(false).perPage(500).sort('id').build();
    } else {
      uri = requestBuilder.productProjections.parse({ priceCountry: 'CA', priceCurrency: 'CAD' }).withTotal(false).perPage(500).sort('id').where(`id > "${lastId}"`).build();
    }

    try {
      const response = await client.execute({ method, uri });

      resultCount = response.body.count;
      productTotal += resultCount;
      console.log('Total Products: ', productTotal);

      const results = response.body.results;
      results.forEach ((result) => {
        //console.log('Current price: ', result.masterVariant.price);
        const currentPrice = result.masterVariant.price && result.masterVariant.price.value.centAmount/100 || null
        productPrices.push({ styleId: result.key, currentPrice });
        wstreamOutput.write(`${result.key},${currentPrice}`+'\n') 
      });
      //console.log('productPrices', productPrices);

      lastId = results[results.length-1].id;
      //break;
    } catch (err) {
        if (err.code === 404) return null;
        throw err;
    }
  }
  return {
    productTotal
  };
}

const runQuery = async (ctHelpers, whereQuery) => {
  const method = 'GET';
  const { client, requestBuilder } = ctHelpers;

  let recordTotal = 0;

  let lastId = null;

  let uri;
  uri = requestBuilder.orders.withTotal(false).perPage(500).sort('id').where(whereQuery).build();
  let response = await client.execute({ method, uri });
  let resultCount = 500;
  resultCount = response.body.count;
  
  while (resultCount === 500) {
    if (!lastId) {
      uri = requestBuilder.orders.withTotal(false).perPage(500).sort('id').where(whereQuery).build();
    } else {
      uri = requestBuilder.orders.withTotal(false).perPage(500).sort('id').where(`id > "${lastId}" and ` + whereQuery).build();
    }

    try {
      response = await client.execute({ method, uri });

      resultCount = response.body.count;
      recordTotal += resultCount;
      console.log('Total orders: ', recordTotal);
      const results = response.body.results;
      console.log('results', results);
      results.forEach(result => {
        console.log(result.key);
      })

      lastId = results[results.length-1].id;
    } catch (err) {
        if (err.code === 404) return null;
        throw err;
    }
  }
  return {
    recordTotal
  };
}

const getProductPrice = (ctHelpers) => getAllProducts(ctHelpers);
const getOrders = (ctHelpers) => runQuery(ctHelpers, whereGetOrder);
const getCrm = (ctHelpers) => runQuery(ctHelpers, whereGetCrm);

module.exports = {
  getProductPrice,
  getOrders,
  getCrm
}
