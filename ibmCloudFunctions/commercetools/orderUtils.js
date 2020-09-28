const { orderAttributeNames, orderDetailAttributeNames, orderStates, orderLineItemStates, SHIPMENT_NAMESPACE } = require('./constantsCt');
const { groupByAttribute, getMostUpToDateObject } = require('../lib/utils');
const { log } = require('../product-consumers/utils');

const groupByOrderNumber = groupByAttribute('orderNumber');
const groupByLineId = groupByAttribute('id');
const getMostUpToDateOrderDetail = getMostUpToDateObject(orderDetailAttributeNames.ORDER_DETAIL_LAST_MODIFIED_DATE);

const removeDuplicateOrderDetails = orderDetails => {
  const orderDetailsGroupedByLineId = groupByLineId(orderDetails);

  return orderDetailsGroupedByLineId.reduce((filteredOrderDetails, orderDetailBatch) => {
    const mostUpToDateOrderDetail = getMostUpToDateOrderDetail(orderDetailBatch);
    return [...filteredOrderDetails, mostUpToDateOrderDetail];    
  }, []);
};

const getOutOfDateRecordIds = (existingCtRecords, records, key, comparisonFieldPath) => (
  existingCtRecords.filter(ctRecord => {
    const correspondingJestaRecord = records.find(record => record[key] === ctRecord[key]);
    if (!correspondingJestaRecord) return false;
    return existingCtRecordIsNewer(ctRecord, correspondingJestaRecord, comparisonFieldPath);
  }).map(record => record[key])
);

const existingCtRecordIsNewer = (existingCtRecord, givenRecord, comparisonFieldPath) => {
  const existingRecordLastModifiedDate = comparisonFieldPath.reduce((previous, current) => previous[current], existingCtRecord);
  const givenRecordLastModifiedDate = givenRecord[comparisonFieldPath[comparisonFieldPath.length-1]]
  if (!existingRecordLastModifiedDate) return false;

  const existingCtRecordDate = new Date(existingRecordLastModifiedDate);

  return existingCtRecordDate.getTime() > givenRecordLastModifiedDate.getTime();
};

const getCtOrderDetailFromCtOrder = (lineId, ctOrder) => {
  const orderDetails = ctOrder.lineItems;
  return orderDetails.find(lineItem => lineItem.id === lineId);
};

const getCtOrderDetailsFromCtOrder = (orderDetails, ctOrder) => (
  orderDetails.map(
    orderDetail => getCtOrderDetailFromCtOrder(orderDetail.id, ctOrder)
  ).filter(Boolean)
);

const getExistingCtOrder = async (orderNumber, { client, requestBuilder }) => {
  const method = 'GET';

  const uri = requestBuilder.orders.where(`orderNumber = "${orderNumber}"`).build();

  try {
    const response = await client.execute({ method, uri });
    return response.body.results[0];
  } catch (err) {
      if (err.code === 404) return null;
      throw err;
  }
};

const getActionsFromOrder = (order, existingCtOrder) => {
  const customAttributesToUpdate = Object.values(orderAttributeNames);

  let customTypeUpdateAction = null;
  if (!existingCtOrder.custom) {
    customTypeUpdateAction = { 
        action: 'setCustomType',
        type: {
          key: 'orderCustomFields'
        },
        fields: {}
    }
    customAttributesToUpdate.forEach(attribute => {
      customTypeUpdateAction.fields[attribute] = order[attribute];
    })
  } 

  const customAttributeUpdateActions = existingCtOrder.custom
    ? customAttributesToUpdate.map(attribute => ({
      action: 'setCustomField',
      name: attribute,
      value: order[attribute]
    }))
    : []

  const statusUpdateAction = order.orderStatus
    ? { action: 'transitionState', state: { key: orderStates[order.orderStatus] }, force: true }
    : null;
  
  const allUpdateActions = [...customAttributeUpdateActions, customTypeUpdateAction, statusUpdateAction].filter(Boolean);

  return allUpdateActions;
};

const updateOrder = async ({ order, existingCtOrder, ctHelpers }) => {
  const { client, requestBuilder } = ctHelpers;
  if (!order.orderNumber) throw new Error('Order lacks required key \'id\'');
  if (!existingCtOrder.version) throw new Error('Invalid arguments: must include existing order \'version\'');

  const method = 'POST';
  const uri = requestBuilder.orders.byId(existingCtOrder.id).build();
  const actions = getActionsFromOrder(order, existingCtOrder);
  const body = JSON.stringify({ version: existingCtOrder.version, actions });

  return client.execute({ method, uri, body });
};

const existingCtOrderIsNewer = (existingCtOrder, givenOrder) => {
  const existingCtOrderCustomAttributes = existingCtOrder.custom;
  if (!existingCtOrderCustomAttributes) return false;

  const existingCtOrderDate = new Date(existingCtOrderCustomAttributes.fields.orderLastModifiedDate);

  return existingCtOrderDate.getTime() > givenOrder[orderAttributeNames.ORDER_LAST_MODIFIED_DATE].getTime();
};

const updateOrderStatus = async (ctHelpers, order) => {
  const existingCtOrder = await getExistingCtOrder(order.orderNumber, ctHelpers);

  if (!existingCtOrder) {
    log.error(`Order number does not exist in CT ${order.orderNumber}`);
    throw new Error('Order number does not exist');
  }
  if (existingCtOrderIsNewer(existingCtOrder, order)) {
    return null;
  }

  return updateOrder({ order, existingCtOrder, ctHelpers });
};

const getActionsFromOrderDetail = (orderDetail, existingOrderDetail) => {
  if (!existingOrderDetail) {
    log.error(`Order line id does not exist in CT order. Order Number: ${orderDetail.orderNumber}, Line Id: ${orderDetail.id}`);
    throw new Error('Order line id does not exist');
  }

  const customAttributesToUpdate = Object.values(orderDetailAttributeNames);

  let customTypeUpdateAction = null;
  if (existingOrderDetail && !existingOrderDetail.custom) {
    customTypeUpdateAction = { 
        action: 'setLineItemCustomType',
        type: {
          key: 'customLineItemFields' 
        },
        lineItemId: existingOrderDetail.id,
        fields: {}
    }
    customAttributesToUpdate.forEach(attribute => {
      customTypeUpdateAction.fields[attribute] = orderDetail[attribute];
    })
  } 

  const customAttributeUpdateActions = existingOrderDetail && existingOrderDetail.custom
    ? customAttributesToUpdate.map(attribute => ({
      action: 'setLineItemCustomField',
      lineItemId: existingOrderDetail.id,
      name: attribute,
      value: orderDetail[attribute]
    }))
    : []

  const statusUpdateAction = orderDetail.orderStatus && existingOrderDetail
    ? { 
        action: 'transitionLineItemState',
        lineItemId: existingOrderDetail.id,
        quantity: existingOrderDetail.quantity,
        fromState: existingOrderDetail.state[0].state,
        toState: { key: orderLineItemStates[orderDetail.orderStatus] },
        force: true 
      }
    : null;

  const allUpdateActions = [...customAttributeUpdateActions, customTypeUpdateAction, statusUpdateAction].filter(Boolean);
  return allUpdateActions;
};

const getActionsFromOrderDetails = (orderDetails, existingCtOrderDetails) => {
  let orderDetailUpdateError = null;
  const actions = orderDetails.reduce((previousActions, orderDetail) => {
    const matchingCtOrderDetail = existingCtOrderDetails.find(ctOrderDetail => ctOrderDetail.id === orderDetail.id);

    try {
      const attributeUpdateActions = getActionsFromOrderDetail(orderDetail, matchingCtOrderDetail)
      if (matchingCtOrderDetail) return [...previousActions, ...attributeUpdateActions];
    } catch (error) {
      orderDetailUpdateError = error
    }
    return [...previousActions];
  }, [])

  return { orderDetailUpdateError, actions }
};

const formatOrderDetailBatchRequestBody = (orderDetailsToCreateOrUpdate, ctOrder, existingCtOrderDetails) => {
  const { actions, orderDetailUpdateError } = getActionsFromOrderDetails(orderDetailsToCreateOrUpdate, existingCtOrderDetails);

  return { body: JSON.stringify({ version: ctOrder.version, actions }), error: orderDetailUpdateError }
};

const updateOrderDetailBatchStatus = async (orderDetailsToUpdate, existingCtOrderDetails, existingCtOrder, { client, requestBuilder }) => {
  if (orderDetailsToUpdate.length === 0) return null;

  const method = 'POST';
  const uri = requestBuilder.orders.byId(existingCtOrder.id).build();
  const { body, error } = formatOrderDetailBatchRequestBody(orderDetailsToUpdate, existingCtOrder, existingCtOrderDetails);

  if (error) {
    await client.execute({ method, uri, body });
    return error
  } else {
    return client.execute({ method, uri, body });
  }
};

const getExistingCtShipments = async (shipments, ctHelpers) => (
  (await Promise.all(shipments.map(shipment => getShipmentFromCt(shipment, ctHelpers))))
    .filter(Boolean)
);

const getShipmentFromCt = async (shipment, { client, requestBuilder }) => {
  const method = 'GET';
  const uri = `${requestBuilder.customObjects.build()}/${SHIPMENT_NAMESPACE}/${shipment.shipmentId}`;

  try {
    const response = await client.execute({ method, uri }); 
    return response.body;
  } catch (err) {
    if (err.statusCode === 404) return null;
    throw err;
  }
};


module.exports = {
  getOutOfDateRecordIds,
  getExistingCtShipments,
  updateOrderStatus,
  groupByOrderNumber,
  getExistingCtOrder,
  getCtOrderDetailsFromCtOrder,
  getCtOrderDetailFromCtOrder,
  removeDuplicateOrderDetails,
  updateOrderDetailBatchStatus,
  getActionsFromOrderDetail,
  getActionsFromOrderDetails,
  existingCtRecordIsNewer,
  formatOrderDetailBatchRequestBody,
  getMostUpToDateOrderDetail,
};
