const fetch = require('node-fetch').default
const base64 = require('base-64')

const {
  LOCALE_TO_PRODUCT,
  MISSING_NARVAR_ORDER_STRING,
  NARVAR_ORDER_LAST_MODIFIED,
  NARVAR_ORDER_ITEM_LAST_MODIFIED,
  NARVAR_DELIVERY_LAST_MODIFIED,
  NARVAR_DELIVERY_ITEM_LAST_MODIFIED
} = require('./constantsNarvar') 
const { groupByAttribute, getMostUpToDateObject } = require('../lib/utils');

const groupByItemId = groupByAttribute('item_id');
const groupByTrackingNumber = groupByAttribute('tracking_number');
const groupById = groupByAttribute('id');

const getItemImage = (styleId) => `https://i1.adis.ws/i/harryrosen/${styleId}?$prp-4col-xl$`
const getItemUrl = (styleId, locale) => `https://harryrosen.com/${locale.substr(0,2)}/${LOCALE_TO_PRODUCT[locale]}/${styleId}`

const firstNarvarDateIsNewer = (inboundObj, narvarObj, compareDateField) => (!narvarObj.attributes || !narvarObj.attributes[compareDateField] || new Date(inboundObj.attributes[compareDateField]).getTime() >= new Date(narvarObj.attributes[compareDateField]).getTime())

const findMatchingRecord = (records, recordToFind, key) => records.find(record => record[key] === recordToFind[key])

const mergeFulfillmentType = (correspondingNarvarItem, mergedSalesOrderItem) => ({
  ...correspondingNarvarItem,
  fulfillment_type: mergedSalesOrderItem.fulfillment_type,
  attributes: {
    ...correspondingNarvarItem.attributes,
    [NARVAR_ORDER_ITEM_LAST_MODIFIED]: correspondingNarvarItem.attributes[NARVAR_ORDER_ITEM_LAST_MODIFIED],
    [NARVAR_DELIVERY_ITEM_LAST_MODIFIED]: mergedSalesOrderItem.attributes[NARVAR_DELIVERY_ITEM_LAST_MODIFIED]
  } 
})
const acceptMergedSalesOrderItem = (correspondingNarvarItem, mergedSalesOrderItem) => ({
  ...mergedSalesOrderItem,
  fulfillment_type: correspondingNarvarItem.fulfillment_type,
  attributes: {
    ...mergedSalesOrderItem.attributes,
    [NARVAR_ORDER_ITEM_LAST_MODIFIED]: mergedSalesOrderItem.attributes[NARVAR_ORDER_ITEM_LAST_MODIFIED],
    [NARVAR_DELIVERY_ITEM_LAST_MODIFIED]: correspondingNarvarItem.attributes[NARVAR_DELIVERY_ITEM_LAST_MODIFIED]
  }
})

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

const mergeNarvarDeliveryItems = (inboundDelivery, existingNarvarDelivery) => {
  const deliveryItemLastModifiedDates = {}
  const unchangedExistingDeliveryItems = existingNarvarDelivery.items_info.map(existingNarvarDeliveryItem => {
    const lastModifiedDateKey = `${existingNarvarDeliveryItem.item_id}-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`

    const correspondingJestaDeliveryItem = findMatchingRecord(inboundDelivery.items_info, existingNarvarDeliveryItem, 'item_id')
    if (!correspondingJestaDeliveryItem) { 
      deliveryItemLastModifiedDates[lastModifiedDateKey] = existingNarvarDelivery.attributes[lastModifiedDateKey]
      return existingNarvarDeliveryItem
    }
  
    if (!firstNarvarDateIsNewer(inboundDelivery, existingNarvarDelivery, lastModifiedDateKey)) {
      deliveryItemLastModifiedDates[lastModifiedDateKey] = existingNarvarDelivery.attributes[lastModifiedDateKey]
      return existingNarvarDeliveryItem
    } else {
      return null
    }
  }).filter(Boolean)

  const updatedDeliveryItems = inboundDelivery.items_info.map(inboundDeliveryItem => {
    const lastModifiedDateKey = `${inboundDeliveryItem.item_id}-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`
    const correspondingNarvarDeliveryItem = findMatchingRecord(existingNarvarDelivery.items_info, inboundDeliveryItem, 'item_id')
    if (!correspondingNarvarDeliveryItem) {
      deliveryItemLastModifiedDates[lastModifiedDateKey] = inboundDelivery.attributes[lastModifiedDateKey]
      return inboundDeliveryItem
    }

    if (firstNarvarDateIsNewer(inboundDelivery, existingNarvarDelivery, lastModifiedDateKey)) {
      deliveryItemLastModifiedDates[lastModifiedDateKey] = inboundDelivery.attributes[lastModifiedDateKey]
      return inboundDeliveryItem
    } else {
      return null
    }
  }).filter(Boolean)

  if (updatedDeliveryItems.length === 0) {
    return null
  }

  return { deliveryItems: [...unchangedExistingDeliveryItems, ...updatedDeliveryItems], deliveryItemLastModifiedDates }
}

const mergeNarvarDeliveries = (mergedDeliveries, existingNarvarDeliveries, uniqueId) => {
  const unchangedExistingDeliveries = existingNarvarDeliveries.map(existingNarvarDelivery => {
    const correspondingJestaDelivery = findMatchingRecord(mergedDeliveries, existingNarvarDelivery, uniqueId)
    if (!correspondingJestaDelivery) return existingNarvarDelivery

    const mergedItemsInfo = mergeNarvarDeliveryItems(correspondingJestaDelivery, existingNarvarDelivery)
    const isJestaDeliveryNewer = firstNarvarDateIsNewer(correspondingJestaDelivery, existingNarvarDelivery, NARVAR_DELIVERY_LAST_MODIFIED)
    if (!isJestaDeliveryNewer && !mergedItemsInfo) {
      return existingNarvarDelivery
    } else {
      return null
    }
  }).filter(Boolean)

  const updatedDeliveries = mergedDeliveries.map(mergedDelivery => {
    const correspondingNarvarDelivery = findMatchingRecord(existingNarvarDeliveries, mergedDelivery, uniqueId)
    if (!correspondingNarvarDelivery) return mergedDelivery

    const mergedItemsInfo = mergeNarvarDeliveryItems(mergedDelivery, correspondingNarvarDelivery)
    const isJestaDeliveryNewer = firstNarvarDateIsNewer(mergedDelivery, correspondingNarvarDelivery, NARVAR_DELIVERY_LAST_MODIFIED)
    if (isJestaDeliveryNewer && mergedItemsInfo) {
      return { ...mergedDelivery, items_info: mergedItemsInfo.deliveryItems, attributes: { ...mergedDelivery.attributes, ...mergedItemsInfo.deliveryItemLastModifiedDates } }
    } else if (isJestaDeliveryNewer && !mergedItemsInfo) {
      return { ...mergedDelivery, items_info: correspondingNarvarDelivery.items_info, attributes: { ...correspondingNarvarDelivery.attributes, [NARVAR_DELIVERY_LAST_MODIFIED]: mergedDelivery.attributes[NARVAR_DELIVERY_LAST_MODIFIED] } }
    } else if (!isJestaDeliveryNewer && mergedItemsInfo) {
      return { ...correspondingNarvarDelivery, items_info: mergedItemsInfo.deliveryItems, attributes: { ...correspondingNarvarDelivery.attributes, ...mergedItemsInfo.deliveryItemLastModifiedDates } }
    } else {
      return null
    }
  }).filter(Boolean)

  if (updatedDeliveries.length === 0) {
    return null
  }
  return [...unchangedExistingDeliveries, ...updatedDeliveries]
}

const mergeNarvarItems = ({ mergedSalesOrderItems, existingNarvarOrderItems, compareDateField, mergeNarvarItem }) => {
  const unchangedExistingItems = existingNarvarOrderItems.map(existingNarvarOrderItem => {
    const correspondingJestaItem = findMatchingRecord(mergedSalesOrderItems, existingNarvarOrderItem, 'item_id')
    if (!correspondingJestaItem) return existingNarvarOrderItem
    return (!firstNarvarDateIsNewer(correspondingJestaItem, existingNarvarOrderItem, compareDateField))
      ? existingNarvarOrderItem
      : null
  }).filter(Boolean)

  const updatedItems = mergedSalesOrderItems.map(mergedSalesOrderItem => {
    const correspondingNarvarItem = findMatchingRecord(existingNarvarOrderItems, mergedSalesOrderItem, 'item_id')
    if (!correspondingNarvarItem) return mergedSalesOrderItem
    return (firstNarvarDateIsNewer(mergedSalesOrderItem, correspondingNarvarItem, compareDateField))
      ? mergeNarvarItem(correspondingNarvarItem, mergedSalesOrderItem)
      : null
  }).filter(Boolean)

  if (updatedItems.length === 0) {
    return null
  }
  return [...unchangedExistingItems, ...updatedItems]
}

const mergeNarvarOrderWithDeliveries = (mergedSalesOrder, existingNarvarOrder) => {
  let orderItems, orderShipments, orderPickups
  const orderHeader = existingNarvarOrder.order_info

  orderItems = mergeNarvarItems({
    mergedSalesOrderItems: mergedSalesOrder.order_info.order_items,
    existingNarvarOrderItems: existingNarvarOrder.order_info.order_items,
    compareDateField: NARVAR_DELIVERY_ITEM_LAST_MODIFIED,
    mergeNarvarItem: mergeFulfillmentType
  })
  orderShipments = mergeNarvarDeliveries(mergedSalesOrder.order_info.shipments || [], existingNarvarOrder.order_info.shipments || [], 'tracking_number')
  orderPickups = mergeNarvarDeliveries(mergedSalesOrder.order_info.pickups || [], existingNarvarOrder.order_info.pickups || [], 'id')
  if (!orderShipments && !orderPickups && !orderItems) return null
  if (!orderItems) orderItems = existingNarvarOrder.order_info.order_items
  if (!orderShipments) orderShipments = existingNarvarOrder.order_info.shipments
  if (!orderPickups) orderPickups = existingNarvarOrder.order_info.pickups
  return { order_info: { ...orderHeader, order_items: orderItems, shipments: orderShipments, pickups: orderPickups } }
}

const mergeNarvarOrder = (mergedSalesOrder, existingNarvarOrder) => {
  let orderHeader, orderItems
  if (firstNarvarDateIsNewer(mergedSalesOrder.order_info, existingNarvarOrder.order_info, NARVAR_ORDER_LAST_MODIFIED)) {
    orderHeader = mergedSalesOrder.order_info
  } 
  orderItems = mergeNarvarItems ({
    mergedSalesOrderItems: mergedSalesOrder.order_info.order_items,
    existingNarvarOrderItems: existingNarvarOrder.order_info.order_items,
    compareDateField: NARVAR_ORDER_ITEM_LAST_MODIFIED,
    mergeNarvarItem: acceptMergedSalesOrderItem
  })
  if (!orderHeader && !orderItems) return null
  if (!orderHeader) orderHeader = existingNarvarOrder.order_info
  if (!orderItems) orderItems = existingNarvarOrder.order_info.order_items
  return { order_info: { ...orderHeader, order_items: orderItems } }
}

const mergeDeliveryItems = (deliveries) => {
  const allDeliveryItems = deliveries.reduce((previous, current) => previous.concat(current.items_info), [])
  const allDeliveryItemsGroupByItemId = groupByItemId(allDeliveryItems)
  const allDeliveryItemsFiltered = allDeliveryItemsGroupByItemId.reduce((previous, current) => previous.concat((getMostUpToDateObject(['attributes', `${current[0].item_id}-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`])(deliveries)).items_info[0]), [])
  return allDeliveryItemsFiltered
}

const mergeSalesOrderItems = (salesOrderBatch, orderItemCompareDateField) => {
  const allItems = salesOrderBatch.reduce((previous, current) => previous.concat(current.order_info.order_items), [])
  const allItemsGroupByItemId = groupByItemId(allItems)
  const allItemsFiltered = allItemsGroupByItemId.reduce((previous, current) => previous.concat(getMostUpToDateObject(['attributes', orderItemCompareDateField])(current)), [])
  return allItemsFiltered
}

const mergeDeliveries = (salesOrderBatch, deliveryName, groupByFunction) => {
  const allDeliveries = salesOrderBatch.reduce((previous, current) => previous.concat(current.order_info[deliveryName]), [])
  const allDeliveriesGroupByUniqueId = groupByFunction(allDeliveries)
  const allDeliveriesFiltered = allDeliveriesGroupByUniqueId.map(deliveriesGroupByUniqueId => {
    let mostUpToDateDelivery = getMostUpToDateObject(['attributes', NARVAR_DELIVERY_LAST_MODIFIED])(deliveriesGroupByUniqueId)
    const mergedDeliveryItems = mergeDeliveryItems(deliveriesGroupByUniqueId)
    deliveriesGroupByUniqueId.forEach(delivery => {
      const compareDateField = `${delivery.items_info[0].item_id}-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`
      mostUpToDateDelivery['attributes'][compareDateField] = (getMostUpToDateObject(['attributes', compareDateField])(allDeliveries)).attributes[compareDateField]
    })
    return { ...mostUpToDateDelivery, items_info: mergedDeliveryItems }
  })
  return allDeliveriesFiltered
}

const mergeSalesOrders = (salesOrderBatch, orderItemCompareDateField) => {
  const mostUpToDateOrderHeader = getMostUpToDateObject(['order_info', 'attributes', NARVAR_ORDER_LAST_MODIFIED])(salesOrderBatch)
  const mergedSalesOrderItems = mergeSalesOrderItems (salesOrderBatch, orderItemCompareDateField)
  const mergedShipments = mergeDeliveries(salesOrderBatch, 'shipments', groupByTrackingNumber)
  const mergedPickups = mergeDeliveries(salesOrderBatch, 'pickups', groupById)
  return { order_info: { ...mostUpToDateOrderHeader.order_info, order_items: mergedSalesOrderItems, shipments: mergedShipments, pickups: mergedPickups } }
}

const syncSalesOrderBatchToNarvar = async (narvarCreds, salesOrderBatch) => {
  let finalSalesOrder = mergeSalesOrders (salesOrderBatch, NARVAR_ORDER_ITEM_LAST_MODIFIED)
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
  let finalSalesOrder = mergeSalesOrders (salesOrderBatch, NARVAR_DELIVERY_ITEM_LAST_MODIFIED)
  const existingNarvarOrder = await getNarvarOrder (narvarCreds, salesOrderBatch[0].order_info.order_number)
  if (existingNarvarOrder) {
    finalSalesOrder = mergeNarvarOrderWithDeliveries(finalSalesOrder, existingNarvarOrder)
  }
  if (finalSalesOrder) {
    return sendOrderToNarvar (narvarCreds, finalSalesOrder)
  }
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
  mergeSalesOrders,
  mergeFulfillmentType,
  acceptMergedSalesOrderItem,
  mergeDeliveryItems,
  mergeDeliveries,
  mergeNarvarDeliveryItems,
  mergeNarvarDeliveries,
  mergeNarvarOrderWithDeliveries
}
