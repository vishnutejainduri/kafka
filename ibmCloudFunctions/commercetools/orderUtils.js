const { orderAttributeNames, orderStates } = require('./constantsCt');

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
    throw 'Order number does not exist';
  }
  if (existingCtOrderIsNewer(existingCtOrder, order)) {
    return null;
  }

  return updateOrder({ order, existingCtOrder, ctHelpers });
};

module.exports = {
  updateOrderStatus
};
