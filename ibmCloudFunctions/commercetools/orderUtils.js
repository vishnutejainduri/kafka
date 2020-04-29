const { orderAttributeNames, orderDetailAttributeNames, orderStates } = require('./constantsCt');
const { groupByAttribute } = require('../lib/utils');

const groupByOrderNumber = groupByAttribute('orderNumber');
const groupByBarcode = groupByAttribute('barcode');

const getMostUpToDateOrderDetail = orderDetails => {
  const orderDetailsSortedByDate = orderDetails.sort((orderDetail1, orderDetail2) => (
    orderDetail2[orderDetailAttributeNames.ORDER_DETAIL_LAST_MODIFIED_DATE] - orderDetail1[orderDetailAttributeNames.ORDER_DETAIL_LAST_MODIFIED_DATE]
  ));

  return orderDetailsSortedByDate[0];
};

const removeDuplicateOrderDetails = orderDetails => {
  const orderDetailsGroupedByBarcode = groupByBarcode(orderDetails);

  return orderDetailsGroupedByBarcode.reduce((filteredOrderDetails, orderDetailBatch) => {
    const mostUpToDateOrderDetail = getMostUpToDateOrderDetail(orderDetailBatch);
    return [...filteredOrderDetails, mostUpToDateOrderDetail];    
  }, []);
};

const existingCtOrderDetailIsNewer = (existingCtOrderDetail, givenOrderDetail) => {
  const orderDetailLastModifiedDate = existingCtOrderDetail.custom.fields.orderDetailLastModifiedDate
  if (!orderDetailLastModifiedDate) return false;

  const existingCtOrderDetailDate = new Date(orderDetailLastModifiedDate);

  return existingCtOrderDetailDate.getTime() >= givenOrderDetail[orderDetailAttributeNames.ORDER_DETAIL_LAST_MODIFIED_DATE].getTime();
};

const getOutOfDateOrderDetails = (existingCtOrderDetails, orderDetails) => (
  existingCtOrderDetails.filter(ctOrderDetail => {
    const correspondingJestaOrderDetail = orderDetails.find(orderDetail => orderDetail.barcode === ctOrderDetail.custom.fields.barcodeData.find(barcodeObj => barcodeObj.obj.value.barcode === orderDetail.barcode).obj.value.barcode);
    if (!correspondingJestaOrderDetail) return false;
    return existingCtOrderDetailIsNewer(ctOrderDetail, correspondingJestaOrderDetail);
  }).map(ctOrderDetail => ctOrderDetail.custom.fields.barcodeData.map(barcodeObj => barcodeObj.obj.value.barcode))
);

const getCtOrderDetailFromCtOrder = (barcode, ctOrder) => {
  const orderDetails = ctOrder.lineItems;
  return orderDetails.find(lineItem => lineItem.custom.fields.barcodeData.filter(barcodeObj => barcodeObj.obj.value.barcode === barcode).length > 0);
};

const getCtOrderDetailsFromCtOrder = (orderDetails, ctOrder) => (
  orderDetails.map(
    orderDetail => getCtOrderDetailFromCtOrder(orderDetail.barcode, ctOrder)
  ).filter(Boolean)
);

const getExistingCtOrder = async (orderNumber, { client, requestBuilder }) => {
  const method = 'GET';

  const uri = requestBuilder.orders.where(`orderNumber = "${orderNumber}"`).expand('lineItems[*].custom.fields.barcodeData[*]').build();

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

  return existingCtOrderDate.getTime() >= givenOrder[orderAttributeNames.ORDER_LAST_MODIFIED_DATE].getTime();
};

const updateOrderStatus = async (ctHelpers, order) => {
  const existingCtOrder = await getExistingCtOrder(order.orderNumber, ctHelpers);

  if (!existingCtOrder) {
    throw new Error('Order number does not exist');
  }
  if (existingCtOrderIsNewer(existingCtOrder, order)) {
    return null;
  }

  return updateOrder({ order, existingCtOrder, ctHelpers });
};

const getActionsFromOrderDetail = (orderDetail, existingOrderDetail = null) => {
  const customAttributesToUpdate = Object.values(orderDetailAttributeNames);

  let customTypeUpdateAction = null;
  if (!existingOrderDetail.custom) {
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

  const customAttributeUpdateActions = existingOrderDetail.custom
    ? customAttributesToUpdate.map(attribute => ({
      action: 'setLineItemCustomField',
      lineItemId: existingOrderDetail.id,
      name: attribute,
      value: orderDetail[attribute]
    }))
    : []

  /*const statusUpdateAction = order.orderStatus
    ? { action: 'transitionState', state: { key: order.orderStatus }, force: true }
    : null;*/
  
  const allUpdateActions = [...customAttributeUpdateActions, customTypeUpdateAction].filter(Boolean);

  return allUpdateActions;
};

const getActionsFromOrderDetails = (orderDetails, existingCtOrderDetails) => (
  orderDetails.reduce((previousActions, orderDetail) => {
    const matchingCtOrderDetail = existingCtOrderDetails.find(ctOrderDetail => ctOrderDetail.custom.fields.barcodeData.find(barcodeObj => barcodeObj.obj.value.barcode === orderDetail.barcode).obj.value.barcode == orderDetail.barcode);
    const attributeUpdateActions = getActionsFromOrderDetail(orderDetail, matchingCtOrderDetail);

    if (matchingCtOrderDetail) return [...previousActions, ...attributeUpdateActions];

    return [...previousActions];
  }, [])
);

const formatOrderDetailBatchRequestBody = (orderDetailsToCreateOrUpdate, ctOrder, existingCtOrderDetails) => {
  const actions = getActionsFromOrderDetails(orderDetailsToCreateOrUpdate, existingCtOrderDetails);

  console.log('actions', actions);

  return JSON.stringify({
    version: ctOrder.version,
    actions
  });
};

const updateOrderDetailBatchStatus = (orderDetailsToUpdate, existingCtOrderDetails, existingCtOrder, { client, requestBuilder }) => {
  if (orderDetailsToUpdate.length === 0) return null;

  const method = 'POST';
  const uri = requestBuilder.orders.byId(existingCtOrder.id).build();
  const body = formatOrderDetailBatchRequestBody(orderDetailsToUpdate, existingCtOrder, existingCtOrderDetails);

  return client.execute({ method, uri, body });
};

module.exports = {
  updateOrderStatus,
  groupByOrderNumber,
  getExistingCtOrder,
  getCtOrderDetailsFromCtOrder,
  getOutOfDateOrderDetails,
  removeDuplicateOrderDetails,
  updateOrderDetailBatchStatus
};
