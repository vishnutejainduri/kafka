const fetch = require('node-fetch').default
const base64 = require('base-64')

const {
  LOCALE_TO_PRODUCT,
  MISSING_NARVAR_ORDER_STRING,
  NARVAR_ORDER_LAST_MODIFIED,
  NARVAR_ORDER_ITEM_LAST_MODIFIED,
  NARVAR_SHIPMENT_LAST_MODIFIED,
  NARVAR_SHIPMENT_ITEM_LAST_MODIFIED
} = require('./constantsNarvar') 
const { groupByAttribute, getMostUpToDateObject } = require('../lib/utils');

const groupByItemId = groupByAttribute('item_id');
const groupByTrackingNumber = groupByAttribute('tracking_number');

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
    [NARVAR_SHIPMENT_ITEM_LAST_MODIFIED]: mergedSalesOrderItem.attributes[NARVAR_SHIPMENT_ITEM_LAST_MODIFIED]
  } 
})
const acceptMergedSalesOrderItem = (correspondingNarvarItem, mergedSalesOrderItem) => ({
  ...mergedSalesOrderItem,
  fulfillment_type: correspondingNarvarItem.fulfillment_type,
  attributes: {
    ...mergedSalesOrderItem.attributes,
    [NARVAR_ORDER_ITEM_LAST_MODIFIED]: mergedSalesOrderItem.attributes[NARVAR_ORDER_ITEM_LAST_MODIFIED],
    [NARVAR_SHIPMENT_ITEM_LAST_MODIFIED]: correspondingNarvarItem.attributes[NARVAR_SHIPMENT_ITEM_LAST_MODIFIED]
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

const mergeNarvarShipmentItems = (inboundShipment, existingNarvarShipment) => {
  const shipmentItemLastModifiedDates = {}
  const unchangedExistingShipmentItems = existingNarvarShipment.items_info.map(existingNarvarShipmentItem => {
    const lastModifiedDateKey = `${existingNarvarShipmentItem.item_id}-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`

    const correspondingJestaShipmentItem = findMatchingRecord(inboundShipment.items_info, existingNarvarShipmentItem, 'item_id')
    if (!correspondingJestaShipmentItem) { 
      shipmentItemLastModifiedDates[lastModifiedDateKey] = existingNarvarShipment.attributes[lastModifiedDateKey]
      return existingNarvarShipmentItem
    }
  
    if (!firstNarvarDateIsNewer(inboundShipment, existingNarvarShipment, lastModifiedDateKey)) {
      shipmentItemLastModifiedDates[lastModifiedDateKey] = existingNarvarShipment.attributes[lastModifiedDateKey]
      return existingNarvarShipmentItem
    } else {
      return null
    }
  }).filter(Boolean)

  const updatedShipmentItems = inboundShipment.items_info.map(inboundShipmentItem => {
    const lastModifiedDateKey = `${inboundShipmentItem.item_id}-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`
    const correspondingNarvarShipmentItem = findMatchingRecord(existingNarvarShipment.items_info, inboundShipmentItem, 'item_id')
    if (!correspondingNarvarShipmentItem) {
      shipmentItemLastModifiedDates[lastModifiedDateKey] = inboundShipment.attributes[lastModifiedDateKey]
      return inboundShipmentItem
    }

    if (firstNarvarDateIsNewer(inboundShipment, existingNarvarShipment, lastModifiedDateKey)) {
      shipmentItemLastModifiedDates[lastModifiedDateKey] = inboundShipment.attributes[lastModifiedDateKey]
      return inboundShipmentItem
    } else {
      return null
    }
  }).filter(Boolean)

  if (updatedShipmentItems.length === 0) {
    return null
  }

  return { shipmentItems: [...unchangedExistingShipmentItems, ...updatedShipmentItems], shipmentItemLastModifiedDates }
}

const mergeNarvarShipments = (mergedShipments, existingNarvarShipments) => {
  const unchangedExistingShipments = existingNarvarShipments.map(existingNarvarShipment => {
    const correspondingJestaShipment = findMatchingRecord(mergedShipments, existingNarvarShipment, 'tracking_number')
    if (!correspondingJestaShipment) return existingNarvarShipment

    const mergedItemsInfo = mergeNarvarShipmentItems(correspondingJestaShipment, existingNarvarShipment)
    const isJestaShipmentNewer = firstNarvarDateIsNewer(correspondingJestaShipment, existingNarvarShipment, NARVAR_SHIPMENT_LAST_MODIFIED)
    if (!isJestaShipmentNewer && !mergedItemsInfo) {
      return existingNarvarShipment
    } else {
      return null
    }
  }).filter(Boolean)

  const updatedShipments = mergedShipments.map(mergedShipment => {
    const correspondingNarvarShipment = findMatchingRecord(existingNarvarShipments, mergedShipment, 'tracking_number')
    if (!correspondingNarvarShipment) return mergedShipment

    const mergedItemsInfo = mergeNarvarShipmentItems(mergedShipment, correspondingNarvarShipment)
    const isJestaShipmentNewer = firstNarvarDateIsNewer(mergedShipment, correspondingNarvarShipment, NARVAR_SHIPMENT_LAST_MODIFIED)
    if (isJestaShipmentNewer && mergedItemsInfo) {
      return { ...mergedShipment, items_info: mergedItemsInfo.shipmentItems, attributes: { ...mergedShipment.attributes, ...mergedItemsInfo.shipmentItemLastModifiedDates } }
    } else if (isJestaShipmentNewer && !mergedItemsInfo) {
      return { ...mergedShipment, items_info: correspondingNarvarShipment.items_info, attributes: { ...correspondingNarvarShipment.attributes, [NARVAR_SHIPMENT_LAST_MODIFIED]: mergedShipment.attributes[NARVAR_SHIPMENT_LAST_MODIFIED] } }
    } else if (!isJestaShipmentNewer && mergedItemsInfo) {
      return { ...correspondingNarvarShipment, items_info: mergedItemsInfo.shipmentItems, attributes: { ...correspondingNarvarShipment.attributes, ...mergedItemsInfo.shipmentItemLastModifiedDates } }
    } else {
      return null
    }
  }).filter(Boolean)

  if (updatedShipments.length === 0) {
    return null
  }
  return [...unchangedExistingShipments, ...updatedShipments]
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

const mergeNarvarOrderWithShipments = (mergedSalesOrder, existingNarvarOrder) => {
  let orderItems, orderShipments
  const orderHeader = existingNarvarOrder.order_info

  orderItems = mergeNarvarItems({
    mergedSalesOrderItems: mergedSalesOrder.order_info.order_items,
    existingNarvarOrderItems: existingNarvarOrder.order_info.order_items,
    compareDateField: NARVAR_SHIPMENT_ITEM_LAST_MODIFIED,
    mergeNarvarItem: mergeFulfillmentType
  })
  orderShipments = mergeNarvarShipments(mergedSalesOrder.order_info.shipments, existingNarvarOrder.order_info.shipments || [])
  if (!orderShipments && !orderItems) return null
  if (!orderItems) orderItems = existingNarvarOrder.order_info.order_items
  if (!orderShipments) orderItems = existingNarvarOrder.order_info.shipments
  return { order_info: { ...orderHeader, order_items: orderItems, shipments: orderShipments } }
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

const mergeShipmentItems = (shipments) => {
  const allShipmentItems = shipments.reduce((previous, current) => previous.concat(current.items_info), [])
  const allShipmentItemsGroupByItemId = groupByItemId(allShipmentItems)
  const allShipmentItemsFiltered = allShipmentItemsGroupByItemId.reduce((previous, current) => previous.concat((getMostUpToDateObject(['attributes', `${current[0].item_id}-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`])(shipments)).items_info[0]), [])
  return allShipmentItemsFiltered
}

const mergeSalesOrderItems = (salesOrderBatch, orderItemCompareDateField) => {
  const allItems = salesOrderBatch.reduce((previous, current) => previous.concat(current.order_info.order_items), [])
  const allItemsGroupByItemId = groupByItemId(allItems)
  const allItemsFiltered = allItemsGroupByItemId.reduce((previous, current) => previous.concat(getMostUpToDateObject(['attributes', orderItemCompareDateField])(current)), [])
  return allItemsFiltered
}

const mergeShipments = (salesOrderBatch) => {
  const allShipments = salesOrderBatch.reduce((previous, current) => previous.concat(current.order_info.shipments), [])
  const allShipmentsGroupByTrackingNumber = groupByTrackingNumber(allShipments)
  const allShipmentsFiltered = allShipmentsGroupByTrackingNumber.map(shipmentsGroupByTrackingNumber => {
    let mostUpToDateShipment = getMostUpToDateObject(['attributes', NARVAR_SHIPMENT_LAST_MODIFIED])(shipmentsGroupByTrackingNumber)
    const mergedShipmentItems = mergeShipmentItems(shipmentsGroupByTrackingNumber)
    shipmentsGroupByTrackingNumber.forEach(shipment => {
      const compareDateField = `${shipment.items_info[0].item_id}-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`
      mostUpToDateShipment['attributes'][compareDateField] = (getMostUpToDateObject(['attributes', compareDateField])(allShipments)).attributes[compareDateField]
    })
    return { ...mostUpToDateShipment, items_info: mergedShipmentItems }
  })
  return allShipmentsFiltered
}

const mergeSalesOrders = (salesOrderBatch, orderItemCompareDateField) => {
  const mostUpToDateOrderHeader = getMostUpToDateObject(['order_info', 'attributes', NARVAR_ORDER_LAST_MODIFIED])(salesOrderBatch)
  const mergedSalesOrderItems = mergeSalesOrderItems (salesOrderBatch, orderItemCompareDateField)
  const mergedShipments = mergeShipments(salesOrderBatch)
  return { order_info: { ...mostUpToDateOrderHeader.order_info, order_items: mergedSalesOrderItems, shipments: mergedShipments } }
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
  let finalSalesOrder = mergeSalesOrders (salesOrderBatch, NARVAR_SHIPMENT_ITEM_LAST_MODIFIED)
  const existingNarvarOrder = await getNarvarOrder (narvarCreds, salesOrderBatch[0].order_info.order_number)
  if (existingNarvarOrder) {
    finalSalesOrder = mergeNarvarOrderWithShipments(finalSalesOrder, existingNarvarOrder)
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
  mergeShipmentItems,
  mergeShipments,
  mergeNarvarShipmentItems,
  mergeNarvarShipments
}
