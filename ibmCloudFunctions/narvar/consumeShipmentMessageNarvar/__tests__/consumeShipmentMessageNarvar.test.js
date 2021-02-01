const consumeShipmentMessageNarvar = require('..');
const {
  filterShipmentMessages,
  parseShipmentMessage,
  filterMissingTrackingNumberMessages
} = require('../../../lib/parseShipmentMessageNarvar');
const {
  addErrorHandling,
} = require('../../../product-consumers/utils');
const {
  NARVAR_SHIPMENT_ITEM_LAST_MODIFIED
} = require('../../constantsNarvar') 
const {
  //mergeNarvarItems,
  //mergeNarvarOrder,
  mergeShipmentItems,
  //mergeSalesOrders,
  //mergeFulfillmentType
} = require('../../narvarUtils')

jest.mock('node-fetch');

const validParams = {
  topicName: 'shipment-details-connect-jdbc',
  messages: [{
      topic: 'shipment-details-connect-jdbc',
      value: {
        SHIPMENT_ID: 'shipmentId',
        SITE_ID: 'siteId',
        LINE: 1,
        BUSINESS_UNIT_ID: 1,
        STATUS: 'SHIPPED',
        ORDER_NUMBER: '67897',
        TRACKING_NUMBER: 'trackingNumber', 
        CARRIER_ID: 'carrierId',
        QTY_SHIPPED: 1.0,
        EXT_REF_ID: 'extRefId',
        MODIFIED_DATE: 1000000000000,
        CREATED_DATE: 1000000000000,
        SHIPPED_DATE: 1000000000000,
        SHIPMENT_MODIFIED_DATE: 1000000000000,
        SHIPMENT_CREATED_DATE: 1000000000000,
        SKU: 'sku',
        DEST_SITE_ID: 'destSiteId',
        SERVICE_TYPE: 'serviceType',
        FROM_STORE_NAME: 'fromStoreName',
        FROM_ADDRESS_1: 'fromAddress1',
        FROM_ADDRESS_2: 'fromAddress2',
        FROM_CITY: 'fromCity',
        FROM_STATE_ID: 'fromStateId',
        FROM_ZIP_CODE: 'fromZipCode',
        FILL_SITE_ID: 'fillSiteId',
        FROM_COUNTRY_ID: 'fromCountryId',
        FROM_HOME_PHONE: 'fromHomePhone',
        EMAIL_ADDRESS: 'emailAddress',
        FIRST_NAME: 'firstName',
        LAST_NAME: 'lastName',
        ADDRESS_1: 'address1',
        ADDRESS_2: 'address2',
        CITY: 'city',
        STATE_ID: 'stateId',
        ZIP_CODE: 'zipCode',
        COUNTRY_ID: 'countryId',
        HOME_PHONE: 'homePhone'
      }
  }],
  narvarUserName: 'narvar-user-name',
  narvarPassword: 'narvar-password',
  narvarUrl: 'narvar-url'
};

const orders =  
  validParams.messages
  .filter(addErrorHandling(filterShipmentMessages))
  .filter(addErrorHandling(filterMissingTrackingNumberMessages))
  .map(addErrorHandling(parseShipmentMessage))

describe('consumeShipmentMessageNarvar', () => {
  it('Returns an error if given params are invalid', async () => {
    const invalidParams = {};
    return expect((await consumeShipmentMessageNarvar(invalidParams)).errorResult).toBeTruthy();
  });

  it('returns success result if given valid params and a valid message', async () => {
    const response = await consumeShipmentMessageNarvar(validParams);
    expect(response).toEqual({
      batchSuccessCount: 1,
      messagesCount: 1,
      ok: true,
      shouldResolveOffsets: 1
    });
  });

  it('returns success result if given valid params and a valid message; batch messages if same order number', async () => {
    const response = await consumeShipmentMessageNarvar({ ...validParams, messages: [{ ...validParams.messages[0] },{ ...validParams.messages[0] }] });
    expect(response).toEqual({
      batchSuccessCount: 1,
      messagesCount: 2,
      ok: true,
      shouldResolveOffsets: 1
    });
  });

  it('returns success result if given valid params and a valid message; don\'t batch messages if different order number', async () => {
    const response = await consumeShipmentMessageNarvar({ ...validParams, messages: [{ ...validParams.messages[0] },{ ...validParams.messages[0], value: { ...validParams.messages[0].value, ORDER_NUMBER: '11111' } }] });
    expect(response).toEqual({
      batchSuccessCount: 2,
      messagesCount: 2,
      ok: true,
      shouldResolveOffsets: 1
    });
  });
});

describe('filterShipmentMessages', () => {
  it('removes messages with wrong topic', async () => {
    const invalidMessages = { ...validParams, messages: [{ ...validParams.messages[0], topic: 'some-topic' }] }
    expect(() => filterShipmentMessages(invalidMessages.messages[0])).toThrow('Can only parse Shipment update messages')
  });
  it('does not remove messages with correct topic', async () => {
    expect(filterShipmentMessages(validParams.messages[0])).toEqual(true)
  });
});

describe('filterMissingTrackingNumberMessages', () => {
  it('removes messages with no tracking number', async () => {
    const invalidMessages = { ...validParams, messages: [{ ...validParams.messages[0], value: { ...validParams.messages[0].value, TRACKING_NUMBER: null } }] }
    expect(filterMissingTrackingNumberMessages(invalidMessages.messages[0])).toEqual(false)
  });
  it('does not remove messages with tracking number', async () => {
    expect(filterMissingTrackingNumberMessages(validParams.messages[0])).toEqual(true)
  });
});

describe('parseShipmentMessage', () => {
  it('inbound jesta message transformed correctly', async () => {
    expect(parseShipmentMessage(validParams.messages[0])).toEqual({"order_info": {"attributes": {"orderLastModifiedDate": null}, "order_items": [{"attributes": {"orderItemLastModifiedDate": null, "shipmentItemLastModifiedDate": "2001-09-09T01:46:40.000Z"}, "fulfillment_type": "BOPIS", "item_id": "extRefId", "sku": "sku"}], "order_number": "67897", "shipments": [{"attributes": {"extRefId-shipmentItemLastModifiedDate": "2001-09-09T01:46:40.000Z", "shipmentLastModifiedDate": "2001-09-09T01:46:40.000Z"}, "carrier": undefined, "carrier_service": null, "items_info": [{"item_id": "extRefId", "quantity": 1, "sku": "sku"}], "ship_date": "2001-09-09T01:46:40.000Z", "ship_method": "serviceType", "shipped_from": {"address": {"city": "fromCity", "country": "fromCountryId", "state": "fromStateId", "street_1": "fromAddress1", "street_2": "fromAddress2", "zip": "fromZipCode"}, "first_name": "fromStoreName", "phone": "fromHomePhone"}, "shipped_to": {"address": {"city": "city", "country": "countryId", "state": "stateId", "street_1": "address1", "street_2": "address2", "zip": "zipCode"}, "email": "emailAddress", "first_name": "firstName", "last_name": "lastName", "phone": "homePhone"}, "tracking_number": "trackingNumber"}]}})
  });
});

/*describe('mergeNarvarItems', () => {
  const orderItems = orders[0].order_info.order_items
  it('merging two empty items returns null since there are no needed changes', () => {
    const result = mergeNarvarItems({
      mergedSalesOrderItems: [],
      existingNarvarOrderItems: [],
      compareDateField: NARVAR_ORDER_ITEM_LAST_MODIFIED,
      mergeNarvarItem: acceptMergedSalesOrderItem
    })
    expect(result).toEqual(null)
  });
  it('merging inbound items with no narvar items returns the inbound items', () => {
    const result = mergeNarvarItems({
      mergedSalesOrderItems: orderItems,
      existingNarvarOrderItems: [],
      compareDateField: NARVAR_ORDER_ITEM_LAST_MODIFIED,
      mergeNarvarItem: acceptMergedSalesOrderItem
    })
    expect(result).toEqual(orderItems)
  });
  it('merging no inbound items and one narvar item returns null since there are no needed changes', () => {
    const narvarItems = [{ ...orderItems[0] }]
    const result = mergeNarvarItems({
      mergedSalesOrderItems: [],
      existingNarvarOrderItems: narvarItems,
      compareDateField: NARVAR_ORDER_ITEM_LAST_MODIFIED,
      mergeNarvarItem: acceptMergedSalesOrderItem
    })
    expect(result).toEqual(null)
  });
  it('merging two of the exact same items returns the single matching item', () => {
    const narvarItems = [{ ...orderItems[0] }]
    const result = mergeNarvarItems({
      mergedSalesOrderItems: orderItems,
      existingNarvarOrderItems: narvarItems,
      compareDateField: NARVAR_ORDER_ITEM_LAST_MODIFIED,
      mergeNarvarItem: acceptMergedSalesOrderItem
    })
    expect(result).toEqual(orderItems)
  });
  it('merging two of the exact same items except the inbound item is more recent; return inbound item', () => {
    const narvarItems = [{ ...orderItems[0], attributes: { orderItemLastModifiedDate: '2000-09-09T01:46:40.000Z' } }]
    const result = mergeNarvarItems({
      mergedSalesOrderItems: orderItems,
      existingNarvarOrderItems: narvarItems,
      compareDateField: NARVAR_ORDER_ITEM_LAST_MODIFIED,
      mergeNarvarItem: acceptMergedSalesOrderItem
    })
    expect(result).toEqual(orderItems)
  });
  it('merging two of the exact same items except the inbound item is older; return null since no changes required', () => {
    const narvarItems = [{ ...orderItems[0], attributes: { orderItemLastModifiedDate: '2002-09-09T01:46:40.000Z' } }]
    const result = mergeNarvarItems({
      mergedSalesOrderItems: orderItems,
      existingNarvarOrderItems: narvarItems,
      compareDateField: NARVAR_ORDER_ITEM_LAST_MODIFIED,
      mergeNarvarItem: acceptMergedSalesOrderItem
    })
    expect(result).toEqual(null)
  });
  it('merging two inbound items but only one is more recent than the narvar item', () => {
    const narvarItems = [{ ...orderItems[0], attributes: { orderItemLastModifiedDate: '2000-09-09T01:46:40.000Z' } }]
    const newOrderItems = [{ ...orderItems[0] }, { ...orderItems[0], item_id: '1' }]
    const result = mergeNarvarItems({
      mergedSalesOrderItems: newOrderItems,
      existingNarvarOrderItems: narvarItems,
      compareDateField: NARVAR_ORDER_ITEM_LAST_MODIFIED,
      mergeNarvarItem: acceptMergedSalesOrderItem
    })
    expect(result).toEqual([newOrderItems[0], newOrderItems[1]])
  });
  it('merging two inbound items but only one is less recent than the narvar item', () => {
    const narvarItems = [{ ...orderItems[0], attributes: { orderItemLastModifiedDate: '2002-09-09T01:46:40.000Z' } }]
    const newOrderItems = [{ ...orderItems[0] }, { ...orderItems[0], item_id: '1' }]
    const result = mergeNarvarItems({
      mergedSalesOrderItems: newOrderItems,
      existingNarvarOrderItems: narvarItems,
      compareDateField: NARVAR_ORDER_ITEM_LAST_MODIFIED,
      mergeNarvarItem: acceptMergedSalesOrderItem
    })
    expect(result).toEqual([narvarItems[0], newOrderItems[1]])
  });
  it('merging two inbound items with two narvar items where both inbound items are more recent', () => {
    const narvarItems = [{ ...orderItems[0], attributes: { orderItemLastModifiedDate: '2000-09-09T01:46:40.000Z' } }, { ...orderItems[0], item_id: '1', attributes: { orderItemLastModifiedDate: '2000-09-09T01:46:40.000Z' } }]
    const newOrderItems = [{ ...orderItems[0] }, { ...orderItems[0], item_id: '1' }]
    const result = mergeNarvarItems({
      mergedSalesOrderItems: newOrderItems,
      existingNarvarOrderItems: narvarItems,
      compareDateField: NARVAR_ORDER_ITEM_LAST_MODIFIED,
      mergeNarvarItem: acceptMergedSalesOrderItem
    })
    expect(result).toEqual([newOrderItems[0], newOrderItems[1]])
  });
  it('merging two inbound items with two narvar items where both inbound items are less recent; return null since no changes are required', () => {
    const narvarItems = [{ ...orderItems[0], attributes: { orderItemLastModifiedDate: '2002-09-09T01:46:40.000Z' } }, { ...orderItems[0], item_id: '1', attributes: { orderItemLastModifiedDate: '2002-09-09T01:46:40.000Z' } }]
    const newOrderItems = [{ ...orderItems[0] }, { ...orderItems[0], item_id: '1' }]
    const result = mergeNarvarItems({
      mergedSalesOrderItems: newOrderItems,
      existingNarvarOrderItems: narvarItems,
      compareDateField: NARVAR_ORDER_ITEM_LAST_MODIFIED,
      mergeNarvarItem: acceptMergedSalesOrderItem
    })
    expect(result).toEqual(null)
  });
});

describe('mergeNarvarOrder', () => {
  it('merging two empty orders returns inbound order', () => {
    const result = mergeNarvarOrder({ order_info: { order_items:[] } }, { order_info: { order_items:[] } })
    expect(result).toEqual({ order_info: { order_items:[] } })
  });
  it('merging inbound order with older narvar order', () => {
    const narvarOrder = { order_info: { ...orders[0].order_info, attributes: { orderLastModifiedDate: '2000-09-09T01:46:40.000Z' } } }
    const result = mergeNarvarOrder(orders[0], narvarOrder)
    expect(result).toEqual(orders[0])
  });
  it('merging inbound order with newer narvar order', () => {
    const narvarOrder = { order_info: { ...orders[0].order_info, attributes: { orderLastModifiedDate: '2002-09-09T01:46:40.000Z' } } }
    const result = mergeNarvarOrder(orders[0], narvarOrder)
    expect(result).toEqual(narvarOrder)
  });
});*/

describe('mergeShipmentItems', () => {
  it('batch only contains 1 shipment item and so just returns the 1 item', () => {
    const result = mergeShipmentItems(orders[0].order_info.shipments, NARVAR_SHIPMENT_ITEM_LAST_MODIFIED)
    expect(result).toEqual(orders[0].order_info.shipments[0].items_info)
  });
  it('batch contains two shipments with two items; should return 2 items', () => {
    const shipments = [{ ...orders[0].order_info.shipments[0], items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] },{ ...orders[0].order_info.shipments[0], attributes: { [`1-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000000 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0], item_id: '1' }] }]
    const result = mergeShipmentItems(shipments, NARVAR_SHIPMENT_ITEM_LAST_MODIFIED)
    expect(result).toEqual([shipments[1].items_info[0], shipments[0].items_info[0]])
  });
});
