const fetch = require('node-fetch')
const base64 = require('base-64')

const { LOCALE_TO_PRODUCT } = require('../narvar/constantsNarvar') 

const getItemImage = (styleId) => `https://i1.adis.ws/i/harryrosen/${styleId}?$prp-4col-xl$`
const getItemUrl = (styleId, locale) => `https://harryrosen.com/${locale.substr(0,2)}/${LOCALE_TO_PRODUCT[locale]}/${styleId}`

const sendOrderToNarvar = (narvarCreds, order) => {
  return fetch(narvarCreds.baseUrl + '/orders', {
    body: JSON.stringify(order),
    headers: {
      Authorization: `Bearer ${base64.encode(narvarCreds.username + ':' + narvarCreds.password)}`
    },
    method: 'POST'
  })
}

const syncSalesOrderDetailBatchToNarvar = (narvarCreds, salesOrderDetailsBatch) => {
  //TODO: Merge the batch and any existing narvar order into a single payload and only then send to narvar
  return sendOrderToNarvar (narvarCreds, salesOrderDetailsBatch[0])
}

module.exports = {
  getItemImage,
  getItemUrl,
  syncSalesOrderDetailBatchToNarvar
}
