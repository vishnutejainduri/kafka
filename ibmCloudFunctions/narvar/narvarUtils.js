const fetch = require('node-fetch').default
const base64 = require('base-64')

const { LOCALE_TO_PRODUCT } = require('../narvar/constantsNarvar') 
const { getMostUpToDateObject } = require('../lib/utils');

const getItemImage = (styleId) => `https://i1.adis.ws/i/harryrosen/${styleId}?$prp-4col-xl$`
const getItemUrl = (styleId, locale) => `https://harryrosen.com/${locale.substr(0,2)}/${LOCALE_TO_PRODUCT[locale]}/${styleId}`

const makeNarvarRequest = async (narvarCreds, path, options) => {
  const response = await fetch(narvarCreds.baseUrl + path, options)
  if (response.ok) return response.json()
  throw new Error(JSON.stringify(await response.json()))
}

const sendOrderToNarvar = async (narvarCreds, order) => {
  const options = {
    body: JSON.stringify(order),
    headers: {
      Authorization: `Basic ${base64.encode(narvarCreds.username + ':' + narvarCreds.password)}`,
      'Content-Type': 'application/json'
    },
    method: 'POST'
  }
  return makeNarvarRequest(narvarCreds, '/orders', options)
}

const getNarvarOrder = async (narvarCreds, orderNumber) => {
  const options = {
    headers: {
      Authorization: `Basic ${base64.encode(narvarCreds.username + ':' + narvarCreds.password)}`,
      'Content-Type': 'application/json'
    },
    method: 'GET' 
  }
  return makeNarvarRequest(narvarCreds, `/orders/${orderNumber}`, options)
}

const mergeSalesOrderDetails = (salesOrderDetailsBatch) => {
  const mostUpToDateOrderHeader = getMostUpToDateObject(['order_info', 'attributes', 'orderLastModifiedDate'])(salesOrderDetailsBatch)
  console.log('mostUpToDateOrderHeader', mostUpToDateOrderHeader)
  return {}
}

const syncSalesOrderDetailBatchToNarvar = async (narvarCreds, salesOrderDetailsBatch) => {
  const newSalesOrder = mergeSalesOrderDetails (salesOrderDetailsBatch)
  console.log('newSalesOrder', newSalesOrder)
  const existingNarvarOrder = await getNarvarOrder (narvarCreds, salesOrderDetailsBatch[0].order_info.order_number)
  console.log('existingNarvarOrder', existingNarvarOrder)
  return sendOrderToNarvar (narvarCreds, salesOrderDetailsBatch[0])
}

module.exports = {
  getItemImage,
  getItemUrl,
  syncSalesOrderDetailBatchToNarvar
}
