const fetch = require('node-fetch').default
const base64 = require('base-64')

const {
  LOCALE_TO_PRODUCT,
  MISSING_NARVAR_ORDER_STRING,
  NARVAR_ORDER_LAST_MODIFIED,
  NARVAR_ORDER_ITEM_LAST_MODIFIED
} = require('./constantsNarvar') 
const { groupByAttribute, getMostUpToDateObject } = require('../lib/utils');

const groupByItemId = groupByAttribute('item_id');

const getItemImage = (styleId) => `https://i1.adis.ws/i/harryrosen/${styleId}?$prp-4col-xl$`
const getItemUrl = (styleId, locale) => `https://harryrosen.com/${locale.substr(0,2)}/${LOCALE_TO_PRODUCT[locale]}/${styleId}`

const firstNarvarDateIsNewer = (inboundObj, narvarObj, compareDateField) => (!narvarObj.attributes || !narvarObj.attributes[compareDateField] || new Date(inboundObj.attributes[compareDateField]).getTime() >= new Date(narvarObj.attributes[compareDateField]).getTime())

const makeNarvarRequest = async (narvarCreds, path, options) => {
  const response = await fetch(narvarCreds.baseUrl + path, options)
  const result = await response.json()
  if (response.ok) {
    if (result.status === 'FAILURE') {
      throw new Error(JSON.stringify(result))
    }
    return result
  }
  throw new Error(JSON.stringify(result))
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

  try {
    const response = await makeNarvarRequest(narvarCreds, `/orders/${orderNumber}`, options)
    return response
  } catch (error) {
    if (error.message.includes(MISSING_NARVAR_ORDER_STRING)) return null // Narvar doesn't send a 404, only way to determine a missing order is via error message string match
    throw error
  }
}

const mergeNarvarItems = (mergedSalesOrderItems, existingNarvarOrderItems) => {
  const unchangedExistingItems = existingNarvarOrderItems.map(existingNarvarOrderItem => {
    const correspondingJestaItem = mergedSalesOrderItems.find(mergedSalesOrderItem => mergedSalesOrderItem.item_id === existingNarvarOrderItem.item_id)
    if (!correspondingJestaItem) return existingNarvarOrderItem
    return (!firstNarvarDateIsNewer(correspondingJestaItem, existingNarvarOrderItem, NARVAR_ORDER_ITEM_LAST_MODIFIED))
      ? existingNarvarOrderItem
      : null
  }).filter(Boolean)

  const updatedItems = mergedSalesOrderItems.map(mergedSalesOrderItem => {
    const correspondingNarvarItem = existingNarvarOrderItems.find(existingNarvarOrderItem => existingNarvarOrderItem.item_id === mergedSalesOrderItem.item_id)
    if (!correspondingNarvarItem) return mergedSalesOrderItem
    return (firstNarvarDateIsNewer(mergedSalesOrderItem, correspondingNarvarItem, NARVAR_ORDER_ITEM_LAST_MODIFIED))
      ? mergedSalesOrderItem
      : null
  }).filter(Boolean)

  if (updatedItems.length === 0) {
    return null
  }
  return [...unchangedExistingItems, ...updatedItems]
}

const mergeNarvarOrder = (mergedSalesOrder, existingNarvarOrder) => {
  let orderHeader, orderItems
  if (firstNarvarDateIsNewer(mergedSalesOrder.order_info, existingNarvarOrder.order_info, NARVAR_ORDER_LAST_MODIFIED)) {
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
  const allItemsFiltered = allItemsGroupByItemId.reduce((previous, current) => previous.concat(getMostUpToDateObject(['attributes', NARVAR_ORDER_ITEM_LAST_MODIFIED])(current)), [])
  return allItemsFiltered
}

const mergeSalesOrders = (salesOrderBatch) => {
  const mostUpToDateOrderHeader = getMostUpToDateObject(['order_info', 'attributes', NARVAR_ORDER_LAST_MODIFIED])(salesOrderBatch)
  const mergedSalesOrderItems = mergeSalesOrderItems (salesOrderBatch)
  return { order_info: { ...mostUpToDateOrderHeader.order_info, order_items: mergedSalesOrderItems } }
}

const syncSalesOrderBatchToNarvar = async (narvarCreds, salesOrderBatch) => {
  let finalSalesOrder = mergeSalesOrders (salesOrderBatch)
  const existingNarvarOrder = await getNarvarOrder (narvarCreds, salesOrderBatch[0].order_info.order_number)
  if (existingNarvarOrder) {
    finalSalesOrder = mergeNarvarOrder (finalSalesOrder, existingNarvarOrder)
  }
  
  if (finalSalesOrder) {
    return sendOrderToNarvar (narvarCreds, finalSalesOrder)
  }
  return null
}

const syncShipmentBatchToNarvar = async (narvarCreds, salesOrderBatch) => {
  return null
}

module.exports = {
  getItemImage,
  getItemUrl,
  syncSalesOrderBatchToNarvar,
  syncShipmentBatchToNarvar,
  mergeNarvarItems,
  mergeNarvarOrder,
  mergeSalesOrderItems,
  mergeSalesOrders
}
