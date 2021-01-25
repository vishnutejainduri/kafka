const fetch = require('node-fetch').default
const base64 = require('base-64')

const { LOCALE_TO_PRODUCT } = require('../narvar/constantsNarvar') 
const { groupByAttribute, getMostUpToDateObject } = require('../lib/utils');

const groupByItemId = groupByAttribute('item_id');

const getItemImage = (styleId) => `https://i1.adis.ws/i/harryrosen/${styleId}?$prp-4col-xl$`
const getItemUrl = (styleId, locale) => `https://harryrosen.com/${locale.substr(0,2)}/${LOCALE_TO_PRODUCT[locale]}/${styleId}`

const compareNarvarDateAttributes = (inboundObj, narvarObj, compareDateField) => (!narvarObj.attributes || new Date(inboundObj.attributes[compareDateField]).getTime() >= new Date(narvarObj.attributes[compareDateField]).getTime())

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

const mergeNarvarItems = (mergedSalesOrderItems, existingNarvarOrderItems) => {
  const unchangedExistingItems = existingNarvarOrderItems.map(existingNarvarOrderItem => {
    const correspondingJestaItem = mergedSalesOrderItems.find(mergedSalesOrderItem => mergedSalesOrderItem.item_id === existingNarvarOrderItem.item_id)
    if (!correspondingJestaItem) return existingNarvarOrderItem
    return (!compareNarvarDateAttributes(correspondingJestaItem, existingNarvarOrderItem, 'orderDetailLastModifiedDate'))
      ? existingNarvarOrderItem
      : null
  }).filter(Boolean)

  const updatedItems = mergedSalesOrderItems.map(mergedSalesOrderItem => {
    const correspondingNarvarItem = existingNarvarOrderItems.find(existingNarvarOrderItem => existingNarvarOrderItem.item_id === mergedSalesOrderItem.item_id)
    if (!correspondingNarvarItem) return mergedSalesOrderItem
    return (compareNarvarDateAttributes(mergedSalesOrderItem, correspondingNarvarItem, 'orderDetailLastModifiedDate'))
      ? null
      : mergedSalesOrderItem
  }).filter(Boolean)

  if (updatedItems.length === 0) {
    return null
  }
  return [...unchangedExistingItems, ...updatedItems]
}

const mergeNarvarOrder = (mergedSalesOrder, existingNarvarOrder) => {
  let orderHeader, orderItems
  if (compareNarvarDateAttributes(mergedSalesOrder.order_info, existingNarvarOrder.order_info, 'orderLastModifiedDate')) {
    orderHeader = mergedSalesOrder.order_info
  } 

  orderItems = mergeNarvarItems (mergedSalesOrder.order_info.order_items, existingNarvarOrder.order_info.order_items)
  if (!orderHeader && !orderItems) return null
  if (!orderHeader) orderHeader = existingNarvarOrder.order_info
  if (!orderItems) orderItems = existingNarvarOrder.order_info.order_items
  return { order_info: { ...orderHeader, order_items: orderItems } }
}

const mergeSalesOrderItems = (salesOrderBatch) => {
  const allItems = salesOrderBatch.reduce((previous, current) => previous.concat(current.order_info.order_items), [])
  const allItemsGroupByItemId = groupByItemId(allItems)
  const allItemsFiltered = allItemsGroupByItemId.reduce((previous, current) => previous.concat(getMostUpToDateObject(['attributes', 'orderDetailLastModifiedDate'])(current)), [])
  return allItemsFiltered
}

const mergeSalesOrders = (salesOrderBatch) => {
  const mostUpToDateOrderHeader = getMostUpToDateObject(['order_info', 'attributes', 'orderLastModifiedDate'])(salesOrderBatch)
  const mergedSalesOrderItems = mergeSalesOrderItems (salesOrderBatch)
  return { order_info: { ...mostUpToDateOrderHeader.order_info, order_items: mergedSalesOrderItems } }
}

const syncSalesOrderBatchToNarvar = async (narvarCreds, salesOrderBatch) => {
  const mergedSalesOrder = mergeSalesOrders (salesOrderBatch)
  const existingNarvarOrder = await getNarvarOrder (narvarCreds, salesOrderBatch[0].order_info.order_number)
  const finalSalesOrder = mergeNarvarOrder (mergedSalesOrder, existingNarvarOrder)
  return sendOrderToNarvar (narvarCreds, finalSalesOrder)
}

module.exports = {
  getItemImage,
  getItemUrl,
  syncSalesOrderBatchToNarvar
}
