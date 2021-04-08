const consumeShipmentMessageNarvar = require('..');
const {
  filterShipmentMessages,
  parseShipmentMessage,
  filterMissingTrackingNumberMessages,
  checkShipmentItemIdForNull
} = require('../../../lib/parseShipmentMessageNarvar');
const { groupByAttribute } = require('../../../lib/utils');
const {
  addErrorHandling,
} = require('../../../product-consumers/utils');
const {
  NARVAR_ORDER_LAST_MODIFIED,
  NARVAR_ORDER_ITEM_LAST_MODIFIED,
  NARVAR_DELIVERY_ITEM_LAST_MODIFIED,
  NARVAR_DELIVERY_LAST_MODIFIED
} = require('../../constantsNarvar') 
const {
  mergeDeliveries,
  mergeDeliveryItems,
  mergeNarvarItems,
  mergeFulfillmentType,
  mergeNarvarDeliveryItems,
  mergeNarvarDeliveries,
  mergeNarvarOrderWithDeliveries
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
        ORDER_CREATED_DATE: 1000000000000,
        LANGUAGE_NO: 1,
        DESC_ENG: 'descEng',
        DESC_FR: 'descFr',
        SKU: 'sku',
        BAR_CODE_ID: 'barcodeNumber',
        DEST_SITE_ID: null,
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
  .filter(addErrorHandling(checkShipmentItemIdForNull))
  .map(addErrorHandling(parseShipmentMessage))

const validBopisParams = { ...validParams, messages: [{ ...validParams.messages, value: { ...validParams.messages[0].value, DEST_SITE_ID: 'siteId' } }] }
const bopisOrders =  
  validBopisParams.messages
  .filter(addErrorHandling(filterShipmentMessages))
  .filter(addErrorHandling(filterMissingTrackingNumberMessages))
  .filter(addErrorHandling(checkShipmentItemIdForNull))
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
  it('removes non-BOPIS messages with no tracking number', async () => {
    const invalidMessages = { ...validParams, messages: [{ ...validParams.messages[0], value: { ...validParams.messages[0].value, TRACKING_NUMBER: null } }] }
    expect(filterMissingTrackingNumberMessages(invalidMessages.messages[0])).toEqual(false)
  });
  it('does not remove messages with tracking number', async () => {
    expect(filterMissingTrackingNumberMessages(validParams.messages[0])).toEqual(true)
  });
  it('does not remove BOPIS messages that lack tracking numbers', () => {
    expect(filterMissingTrackingNumberMessages({
      ...validParams.messages[0],
      DEST_SITE_ID: '1',
      TRACKING_NUMBER: null
    })).toBe(true);
  });
});

describe('checkShipmentItemIdForNull', () => {
  it('removes messages with null item id', async () => {
    const invalidMessages = { ...validParams, messages: [{ ...validParams.messages[0], value: { ...validParams.messages[0].value, EXT_REF_ID: null } }] }
    expect(checkShipmentItemIdForNull(invalidMessages.messages[0])).toEqual(false)
  });
  it('does not remove messages with valid item id', async () => {
    expect(checkShipmentItemIdForNull(validParams.messages[0])).toEqual(true)
  });
});

describe('parseShipmentMessage', () => {
  it('inbound jesta message transformed correctly', async () => {
    expect(parseShipmentMessage(validParams.messages[0])).toEqual({"order_info": {"attributes": {"orderLastModifiedDate": null}, "order_date": "2001-09-09T01:46:40.000Z", "order_items": [{"attributes": {"orderItemLastModifiedDate": null, "deliveryItemLastModifiedDate": "2001-09-09T01:46:40.000Z", "barcode": "barcodeNumber"}, "fulfillment_type": "HD", "item_id": "extRefId", "name": "descEng", "sku": "sku"}], "order_number": "67897", "shipments": [{"attributes": {"extRefId-deliveryItemLastModifiedDate": "2001-09-09T01:46:40.000Z", "deliveryLastModifiedDate": "2001-09-09T01:46:40.000Z"}, "carrier": undefined, "carrier_service": null, "items_info": [{"item_id": "extRefId", "quantity": 1, "sku": "sku"}], "ship_date": "2001-09-09T01:46:40.000Z", "ship_method": undefined, "shipped_from": {"id": null, "address": {"city": "fromCity", "country": "fromCountryId", "state": "fromStateId", "street_1": "fromAddress1", "street_2": "fromAddress2", "zip": "fromZipCode"}, "first_name": "fromStoreName", "phone": "fromHomePhone"}, "shipped_to": {"address": {"city": "city", "country": "countryId", "state": "stateId", "street_1": "address1", "street_2": "address2", "zip": "zipCode"}, "email": "emailAddress", "first_name": "firstName", "last_name": "lastName", "phone": "homePhone"}, "tracking_number": "trackingNumber"}]}})
  });
  it('inbound jesta message transformed correctly for bopis orders', async () => {
    expect(parseShipmentMessage(validBopisParams.messages[0])).toEqual({"order_info": {"attributes": {"orderLastModifiedDate": null}, "order_date": "2001-09-09T01:46:40.000Z", "order_items": [{"attributes": {"deliveryItemLastModifiedDate": "2001-09-09T01:46:40.000Z", "orderItemLastModifiedDate": null, "barcode": "barcodeNumber"}, "fulfillment_type": "BOPIS", "item_id": "extRefId", "name": "descEng", "sku": "sku"}], "order_number": "67897", "pickups": [{"attributes": {"deliveryLastModifiedDate": "2001-09-09T01:46:40.000Z", "extRefId-deliveryItemLastModifiedDate": "2001-09-09T01:46:40.000Z"}, "carrier": undefined, "id": "shipmentId", "items_info": [{"item_id": "extRefId", "quantity": 1, "sku": "sku"}], "ship_date": "2001-09-09T01:46:40.000Z", "status": {"code": undefined, "date": "2001-09-09T01:46:40.000Z"}, "store": {"id": "siteId",  "address": {"city": "fromCity", "country": "fromCountryId", "state": "fromStateId", "street_1": "fromAddress1", "street_2": "fromAddress2", "zip": "fromZipCode"}, "name": "fromStoreName", "phone_number": "fromHomePhone"}, "tracking_number": "trackingNumber", "type": "BOPIS"}]}})
  });
});

describe('mergeDeliveryItems', () => {
  it('batch only contains 1 shipment item and so just returns the 1 item', () => {
    const result = mergeDeliveryItems(orders[0].order_info.shipments, NARVAR_DELIVERY_ITEM_LAST_MODIFIED)
    expect(result).toEqual(orders[0].order_info.shipments[0].items_info)
  });
  it('batch contains two shipments with two items; should return 2 items', () => {
    const shipments = [{ ...orders[0].order_info.shipments[0], items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] },{ ...orders[0].order_info.shipments[0], attributes: { [`1-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000000 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0], item_id: '1' }] }]
    const result = mergeDeliveryItems(shipments, NARVAR_DELIVERY_ITEM_LAST_MODIFIED)
    expect(result).toEqual([shipments[1].items_info[0], shipments[0].items_info[0]])
  });
  it('batch contains two shipments with two of the same items; should return most recent item only', () => {
    const shipments = [{ ...orders[0].order_info.shipments[0], items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] },{ ...orders[0].order_info.shipments[0], attributes: { [`extRefId-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }]
    const result = mergeDeliveryItems(shipments, NARVAR_DELIVERY_ITEM_LAST_MODIFIED)
    expect(result).toEqual([shipments[0].items_info[0]])
  });
  it('batch contains two shipments with two of the same items; should return most recent item only; for BOPIS', () => {
    const pickups = [{ ...bopisOrders[0].order_info.pickups[0], items_info: [{ ...bopisOrders[0].order_info.pickups[0].items_info[0] }] },{ ...bopisOrders[0].order_info.pickups[0], attributes: { [`extRefId-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001 }, items_info: [{ ...bopisOrders[0].order_info.pickups[0].items_info[0] }] }]
    const result = mergeDeliveryItems(pickups, NARVAR_DELIVERY_ITEM_LAST_MODIFIED)
    expect(result).toEqual([pickups[0].items_info[0]])
  });
});

describe('mergeDeliveries', () => {
  const groupByTrackingNumber = groupByAttribute('tracking_number');
  const groupById = groupByAttribute('id');

  it('batch only contains 1 shipment and so just returns the 1 shipment', () => {
    const result = mergeDeliveries(orders, 'shipments', groupByTrackingNumber)
    expect(result).toEqual(orders[0].order_info.shipments)
  });
  it('batch contains two different shipments; should return 2 shipments', () => {
    const newOrders = [{ order_info: { ...orders[0].order_info, shipments: [{ ...orders[0].order_info.shipments[0] },{ ...orders[0].order_info.shipments[0], tracking_number: '1' }] } }]
    const result = mergeDeliveries(newOrders, 'shipments', groupByTrackingNumber)
    expect(result).toEqual([newOrders[0].order_info.shipments[0],newOrders[0].order_info.shipments[1]])
  });
  it('batch contains two of the same shipments; should return most recent shipment only', () => {
    const newOrders = [{ order_info: { ...orders[0].order_info, shipments: [{ ...orders[0].order_info.shipments[0] },{ ...orders[0].order_info.shipments[0], attributes: { [NARVAR_DELIVERY_LAST_MODIFIED]: 1000000000001 } }] } }]
    const result = mergeDeliveries(newOrders, 'shipments', groupByTrackingNumber)
    expect(result).toEqual([newOrders[0].order_info.shipments[1]])
  });
  it('batch contains two of the same shipments but different shipment items; should return 1 shipment with both items', () => {
    const newOrder1 = { order_info: { ...orders[0].order_info, shipments: [{ ...orders[0].order_info.shipments[0], attributes: { [`1-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000000 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0], item_id: '1' }] }] } }
    const newOrder2 = { order_info: { ...orders[0].order_info, shipments: [{ ...orders[0].order_info.shipments[0] }] } }
    const result = mergeDeliveries([newOrder1,newOrder2], 'shipments', groupByTrackingNumber)
    expect(result).toEqual([{ ...orders[0].order_info.shipments[0], items_info: [newOrder2.order_info.shipments[0].items_info[0], newOrder1.order_info.shipments[0].items_info[0]] }])
  });
  it('batch contains two of the same shipments but different shipment items; should return 1 shipment with both items; for BOPIS', () => {
    const newOrder1 = { order_info: { ...bopisOrders[0].order_info, pickups: [{ ...bopisOrders[0].order_info.pickups[0], attributes: { [`1-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000000 }, items_info: [{ ...bopisOrders[0].order_info.pickups[0].items_info[0], item_id: '1' }] }] } }
    const newOrder2 = { order_info: { ...bopisOrders[0].order_info, pickups: [{ ...bopisOrders[0].order_info.pickups[0] }] } }
    const result = mergeDeliveries([newOrder1,newOrder2], 'pickups', groupById)
    expect(result).toEqual([{ ...bopisOrders[0].order_info.pickups[0], items_info: [newOrder2.order_info.pickups[0].items_info[0], newOrder1.order_info.pickups[0].items_info[0]] }])
  });
});

describe('mergeNarvarItems', () => {
  it('batch contains 1 line item; update 1 line item\'s fulfillment type', () => {
    const narvarOrder = { ...orders[0] }
    const result = mergeNarvarItems({
      mergedSalesOrderItems: orders[0].order_info.order_items,
      existingNarvarOrderItems: narvarOrder.order_info.order_items,
      compareDateField: NARVAR_DELIVERY_ITEM_LAST_MODIFIED,
      mergeNarvarItem: mergeFulfillmentType
    })
    expect(result).toEqual([{ ...narvarOrder.order_info.order_items[0], fulfillment_type: 'HD' }])
  });
  it('batch contains 1 line item which doesn\'t exist in narvar; should create line item', () => {
    const narvarOrder = { order_info: { ...orders[0].order_info, order_items: [] } }
    const result = mergeNarvarItems({
      mergedSalesOrderItems: orders[0].order_info.order_items,
      existingNarvarOrderItems: narvarOrder.order_info.order_items,
      compareDateField: NARVAR_DELIVERY_ITEM_LAST_MODIFIED,
      mergeNarvarItem: mergeFulfillmentType
    })
    expect(result).toEqual([{ ...orders[0].order_info.order_items[0], fulfillment_type: 'HD' }])
  });
  it('batch contains 1 line item which does exist in narvar but narvar\'s item is more recent; should do no updates', () => {
    const narvarOrder = { order_info: { ...orders[0].order_info, order_items: [{ ...orders[0].order_info.order_items[0], attributes: { [NARVAR_DELIVERY_ITEM_LAST_MODIFIED]: 1000000000001 } }] } }
    const result = mergeNarvarItems({
      mergedSalesOrderItems: orders[0].order_info.order_items,
      existingNarvarOrderItems: narvarOrder.order_info.order_items,
      compareDateField: NARVAR_DELIVERY_ITEM_LAST_MODIFIED,
      mergeNarvarItem: mergeFulfillmentType
    })
    expect(result).toEqual(null)
  });
  it('batch contains 2 line items one which doesn\'t exist in narvar the other does and is more recent; should return three line items, a new one for narvar and the most recent of the matching ones', () => {
    const narvarOrder = { order_info: { ...orders[0].order_info, order_items: [{ ...orders[0].order_info.order_items[0], item_id: '2' },{ ...orders[0].order_info.order_items[0] }] } }
    const inboundOrder = { order_info: { ...orders[0].order_info, order_items: [{ ...orders[0].order_info.order_items[0], attributes: { [NARVAR_DELIVERY_ITEM_LAST_MODIFIED]: 1000000000001 }, item_id: '2' },{ ...orders[0].order_info.order_items[0], item_id: '1' }] } }
    const result = mergeNarvarItems({
      mergedSalesOrderItems: inboundOrder.order_info.order_items,
      existingNarvarOrderItems: narvarOrder.order_info.order_items,
      compareDateField: NARVAR_DELIVERY_ITEM_LAST_MODIFIED,
      mergeNarvarItem: mergeFulfillmentType
    })
    expect(result).toEqual([{ ...narvarOrder.order_info.order_items[1] },{ ...narvarOrder.order_info.order_items[0], fulfillment_type: 'HD', attributes: { ...narvarOrder.order_info.order_items[0].attributes, [NARVAR_DELIVERY_ITEM_LAST_MODIFIED]: 1000000000001 } }, { ...inboundOrder.order_info.order_items[1] }])
  });
});

describe('mergeNarvarDeliveryItems', () => {
  it('inbound 1 shipment item but narvar\'s shipment item is more recent; do no update', () => {
    const inboundDelivery = { ...orders[0].order_info.shipments[0], items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }
    const narvarDelivery = { ...orders[0].order_info.shipments[0], attributes: { [`extRefId-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }
    const result = mergeNarvarDeliveryItems(inboundDelivery, narvarDelivery)
    expect(result).toEqual(null)
  });
  it('inbound 1 shipment item more recent than narvar\'s shipment item; update one shipment item', () => {
    const inboundDelivery = { ...orders[0].order_info.shipments[0], attributes: { [`extRefId-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }
    const narvarDelivery = { ...orders[0].order_info.shipments[0], items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }
    const result = mergeNarvarDeliveryItems(inboundDelivery, narvarDelivery)
    expect(result).toEqual({
      deliveryItems: [{ ...inboundDelivery.items_info[0] }],
      deliveryItemLastModifiedDates: { [`extRefId-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001 }
    })
  });
  it('inbound 1 shipment item that doesn\'t exist in narvar; keep narvar item add new inbound item', () => {
    const inboundDelivery = { ...orders[0].order_info.shipments[0], attributes: { [`1-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0], item_id: '1' }] }
    const narvarDelivery = { ...orders[0].order_info.shipments[0], items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }
    const result = mergeNarvarDeliveryItems(inboundDelivery, narvarDelivery)
    expect(result).toEqual({
      deliveryItems: [{ ...narvarDelivery.items_info[0] },{ ...inboundDelivery.items_info[0] }],
      deliveryItemLastModifiedDates: { [`extRefId-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: '2001-09-09T01:46:40.000Z', [`1-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001 }
    })
  });
  it('inbound 2 shipment items that one that is older than the narvar match and one that is more recent; keep narvar item that is newer and keep the inbound one that is newer', () => {
    const inboundDelivery = { ...orders[0].order_info.shipments[0], attributes: { [`1-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001, [`extRefId-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000000 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0], item_id: '1' },{ ...orders[0].order_info.shipments[0].items_info[0] }] }
    const narvarDelivery = { ...orders[0].order_info.shipments[0], attributes: { [`1-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000000, [`extRefId-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0], item_id: '1' },{ ...orders[0].order_info.shipments[0].items_info[0] }] }
    const result = mergeNarvarDeliveryItems(inboundDelivery, narvarDelivery)
    expect(result).toEqual({
      deliveryItems: [{ ...narvarDelivery.items_info[1] },{ ...inboundDelivery.items_info[0] }],
      deliveryItemLastModifiedDates: { [`extRefId-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001, [`1-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001 }
    })
  });
});

describe('mergeNarvarDeliveries', () => {
  it('inbound shipment and it\'s items are older than the ones in narvar; no updates', () => {
    const inboundDeliveries = [{ ...orders[0].order_info.shipments[0], items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }]
    const narvarDeliveries = [{ ...orders[0].order_info.shipments[0], attributes: { [`extRefId-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001, [NARVAR_DELIVERY_LAST_MODIFIED]: 1000000000001 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }]
    const result = mergeNarvarDeliveries(inboundDeliveries, narvarDeliveries, 'tracking_number')
    expect(result).toEqual(null)
  });
  it('inbound shipment doesn\'t exist in narvar; should keep existing narvar shipment but add inbound shipment', () => {
    const inboundDeliveries = [{ ...orders[0].order_info.shipments[0], tracking_number: '1', items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }]
    const narvarDeliveries = [{ ...orders[0].order_info.shipments[0], items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }]
    const result = mergeNarvarDeliveries(inboundDeliveries, narvarDeliveries, 'tracking_number')
    expect(result).toEqual([{ ...narvarDeliveries[0] }, { ...inboundDeliveries[0] }])
  });
  it('inbound shipment and it\'s items are both more recent than narvar\'s; should update replacing shipment with inbound', () => {
    const inboundDeliveries = [{ ...orders[0].order_info.shipments[0], attributes: { [`extRefId-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001, [NARVAR_DELIVERY_LAST_MODIFIED]: 1000000000001 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }]
    const narvarDeliveries = [{ ...orders[0].order_info.shipments[0], items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }]
    const result = mergeNarvarDeliveries(inboundDeliveries, narvarDeliveries, 'tracking_number')
    expect(result).toEqual([{ ...inboundDeliveries[0] }])
  });
  it('inbound shipment is more recent than narvar but the narvar shipment items are more recent; should update with inbound shipment but keep narvar shipment items', () => {
    const inboundDeliveries = [{ ...orders[0].order_info.shipments[0], attributes: { [`extRefId-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000000, [NARVAR_DELIVERY_LAST_MODIFIED]: 1000000000001 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }]
    const narvarDeliveries = [{ ...orders[0].order_info.shipments[0], attributes: { [`extRefId-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001, [NARVAR_DELIVERY_LAST_MODIFIED]: 1000000000000 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0], quantity: 99 }] }]
    const result = mergeNarvarDeliveries(inboundDeliveries, narvarDeliveries, 'tracking_number')
    expect(result).toEqual([{ ...inboundDeliveries[0], attributes: { ...inboundDeliveries[0].attributes, [`extRefId-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001 }, items_info: [{ ...narvarDeliveries[0].items_info[0] }] }])
  });
  it('inbound shipment is older than narvar but the inbound shipment items are more recent; should update with inbound shipment items but keep narvar shipment header', () => {
    const inboundDeliveries = [{ ...orders[0].order_info.shipments[0], attributes: { [`extRefId-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001, [NARVAR_DELIVERY_LAST_MODIFIED]: 1000000000000 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }]
    const narvarDeliveries = [{ ...orders[0].order_info.shipments[0], ship_date: 1000000000000, attributes: { [`extRefId-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000000, [NARVAR_DELIVERY_LAST_MODIFIED]: 1000000000001 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0], quantity: 99 }] }]
    const result = mergeNarvarDeliveries(inboundDeliveries, narvarDeliveries, 'tracking_number')
    expect(result).toEqual([{ ...narvarDeliveries[0], attributes: { ...narvarDeliveries[0].attributes, [`extRefId-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001 }, items_info: [{ ...inboundDeliveries[0].items_info[0] }] }])
  });
  it('BIG COMPOUND TEST: inbound shipments are 2 shipments each with 2 shipment items; the 1st shipment is more recent than narvar but one shipment item does not yet exist in narvar; the 2nd shipment is older tha narvar but one of it\'s shipment items are more recent; should output 2 shipments, one being the narvar shipment header, and merged line items between narvar and inbound shipment lines', () => {
    const inboundDeliveries = [{ ...orders[0].order_info.shipments[0], tracking_number: '1', ship_date: 1000000000001, attributes: { [`1-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001, [`2-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001, [NARVAR_DELIVERY_LAST_MODIFIED]: 1000000000001 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0], item_id: '1', quantity: 1 },{ ...orders[0].order_info.shipments[0].items_info[0], item_id: '2', quantity: 2 }] }, { ...orders[0].order_info.shipments[0], tracking_number: '2', ship_date: 1000000000002, attributes: { [`3-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001, [`4-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001, [NARVAR_DELIVERY_LAST_MODIFIED]: 1000000000000 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0], item_id: '3', quantity: 3 },{ ...orders[0].order_info.shipments[0].items_info[0], item_id: '4', quantity: 4 }] } ]
    const narvarDeliveries = [{ ...orders[0].order_info.shipments[0], tracking_number: '1', ship_date: 1000000000003, attributes: { [`1-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000000, [NARVAR_DELIVERY_LAST_MODIFIED]: 1000000000000 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0], item_id: '1', quantity: 11 }] }, { ...orders[0].order_info.shipments[0], tracking_number: '2', ship_date: 1000000000006, attributes: { [`3-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000005, [`4-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000000, [NARVAR_DELIVERY_LAST_MODIFIED]: 1000000000001 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0], item_id: '3', quantity: 33 },{ ...orders[0].order_info.shipments[0].items_info[0], item_id: '4', quantity: 44 }] } ]
    const result = mergeNarvarDeliveries(inboundDeliveries, narvarDeliveries, 'tracking_number')
    expect(result).toEqual([{ ...inboundDeliveries[0], attributes: { ...inboundDeliveries[0].attributes, [`1-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001, [`2-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001 }, items_info: [{ ...inboundDeliveries[0].items_info[0] },{ ...inboundDeliveries[0].items_info[1] }] }, { ...narvarDeliveries[1], attributes: { ...narvarDeliveries[1].attributes, [`3-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000005, [`4-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001 }, items_info: [{ ...narvarDeliveries[1].items_info[0] },{ ...inboundDeliveries[1].items_info[1] }] }])
  });
  it('BIG COMPOUND TEST FOR BOPIS: inbound shipments are 2 shipments each with 2 shipment items; the 1st shipment is more recent than narvar but one shipment item does not yet exist in narvar; the 2nd shipment is older tha narvar but one of it\'s shipment items are more recent; should output 2 shipments, one being the narvar shipment header, and merged line items between narvar and inbound shipment lines', () => {
    const inboundDeliveries = [{ ...bopisOrders[0].order_info.pickups[0], id: '1', ship_date: 1000000000001, attributes: { [`1-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001, [`2-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001, [NARVAR_DELIVERY_LAST_MODIFIED]: 1000000000001 }, items_info: [{ ...bopisOrders[0].order_info.pickups[0].items_info[0], item_id: '1', quantity: 1 },{ ...bopisOrders[0].order_info.pickups[0].items_info[0], item_id: '2', quantity: 2 }] }, { ...bopisOrders[0].order_info.pickups[0], id: '2', ship_date: 1000000000002, attributes: { [`3-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001, [`4-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001, [NARVAR_DELIVERY_LAST_MODIFIED]: 1000000000000 }, items_info: [{ ...bopisOrders[0].order_info.pickups[0].items_info[0], item_id: '3', quantity: 3 },{ ...bopisOrders[0].order_info.pickups[0].items_info[0], item_id: '4', quantity: 4 }] } ]
    const narvarDeliveries = [{ ...bopisOrders[0].order_info.pickups[0], id: '1', ship_date: 1000000000003, attributes: { [`1-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000000, [NARVAR_DELIVERY_LAST_MODIFIED]: 1000000000000 }, items_info: [{ ...bopisOrders[0].order_info.pickups[0].items_info[0], item_id: '1', quantity: 11 }] }, { ...bopisOrders[0].order_info.pickups[0], id: '2', ship_date: 1000000000006, attributes: { [`3-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000005, [`4-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000000, [NARVAR_DELIVERY_LAST_MODIFIED]: 1000000000001 }, items_info: [{ ...bopisOrders[0].order_info.pickups[0].items_info[0], item_id: '3', quantity: 33 },{ ...bopisOrders[0].order_info.pickups[0].items_info[0], item_id: '4', quantity: 44 }] } ]
    const result = mergeNarvarDeliveries(inboundDeliveries, narvarDeliveries, 'id')
    expect(result).toEqual([{ ...inboundDeliveries[0], attributes: { ...inboundDeliveries[0].attributes, [`1-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001, [`2-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001 }, items_info: [{ ...inboundDeliveries[0].items_info[0] },{ ...inboundDeliveries[0].items_info[1] }] }, { ...narvarDeliveries[1], attributes: { ...narvarDeliveries[1].attributes, [`3-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000005, [`4-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001 }, items_info: [{ ...narvarDeliveries[1].items_info[0] },{ ...inboundDeliveries[1].items_info[1] }] }])
  });
});

describe('mergeNarvarOrderWithDeliveries', () => {
  it('merge inbound order with narvar order but the narvar order is completely newer; should do no updates', () => {
    const narvarOrder = { order_info: { ...orders[0].order_info, attributes: { [NARVAR_ORDER_LAST_MODIFIED]: 1000000000001 }, order_items: [{ ...orders[0].order_info.order_items[0], attributes: { [NARVAR_ORDER_ITEM_LAST_MODIFIED]: 1000000000001, [NARVAR_DELIVERY_ITEM_LAST_MODIFIED]: 1000000000001 } }], shipments: [{ ...orders[0].order_info.shipments[0], attributes: { [NARVAR_DELIVERY_LAST_MODIFIED]: 1000000000001, [`extRefId-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }] } }
    const result = mergeNarvarOrderWithDeliveries(orders[0], narvarOrder)
    expect(result).toEqual(null)
  });
  it('merge inbound order with narvar order but the narvar order has newer line items; should not update line items but update the rest', () => {
    const narvarOrder = { order_info: { ...orders[0].order_info, attributes: { [NARVAR_ORDER_LAST_MODIFIED]: 1000000000001 }, order_items: [{ ...orders[0].order_info.order_items[0], attributes: { [NARVAR_ORDER_ITEM_LAST_MODIFIED]: 1000000000001 } }], shipments: [{ ...orders[0].order_info.shipments[0], attributes: { [NARVAR_DELIVERY_LAST_MODIFIED]: 1000000000001, [`extRefId-${NARVAR_DELIVERY_ITEM_LAST_MODIFIED}`]: 1000000000001 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }] } }
    const result = mergeNarvarOrderWithDeliveries(orders[0], narvarOrder)
    expect(result).toEqual({"order_info": {"attributes": {"orderLastModifiedDate": 1000000000001}, "order_date": "2001-09-09T01:46:40.000Z", "order_items": [{"attributes": {"deliveryItemLastModifiedDate": "2001-09-09T01:46:40.000Z", "orderItemLastModifiedDate": 1000000000001}, "fulfillment_type": "HD", "item_id": "extRefId", "name": "descEng", "sku": "sku"}], "order_number": "67897", "pickups": undefined, "shipments": [{"attributes": {"deliveryLastModifiedDate": 1000000000001, "extRefId-deliveryItemLastModifiedDate": 1000000000001}, "carrier": undefined, "carrier_service": null, "items_info": [{"item_id": "extRefId", "quantity": 1, "sku": "sku"}], "ship_date": "2001-09-09T01:46:40.000Z", "ship_method": undefined, "shipped_from": {"id": null, "address": {"city": "fromCity", "country": "fromCountryId", "state": "fromStateId", "street_1": "fromAddress1", "street_2": "fromAddress2", "zip": "fromZipCode"}, "first_name": "fromStoreName", "phone": "fromHomePhone"}, "shipped_to": {"address": {"city": "city", "country": "countryId", "state": "stateId", "street_1": "address1", "street_2": "address2", "zip": "zipCode"}, "email": "emailAddress", "first_name": "firstName", "last_name": "lastName", "phone": "homePhone"}, "tracking_number": "trackingNumber"}]}})
  });
  it('merge inbound order with narvar order but the narvar order has newer shipments; should not update the shipments but update the rest', () => {
    const narvarOrder = { order_info: { ...orders[0].order_info, attributes: { [NARVAR_ORDER_LAST_MODIFIED]: 1000000000001 }, order_items: [{ ...orders[0].order_info.order_items[0], attributes: { [NARVAR_ORDER_ITEM_LAST_MODIFIED]: 1000000000001, [NARVAR_DELIVERY_ITEM_LAST_MODIFIED]: 1000000000001 } }], shipments: [{ ...orders[0].order_info.shipments[0], items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }] } }
    const result = mergeNarvarOrderWithDeliveries(orders[0], narvarOrder)
    expect(result).toEqual({"order_info": {"attributes": {"orderLastModifiedDate": 1000000000001}, "order_date": "2001-09-09T01:46:40.000Z", "order_items": [{"attributes": {"deliveryItemLastModifiedDate": 1000000000001, "orderItemLastModifiedDate": 1000000000001}, "fulfillment_type": "HD", "item_id": "extRefId", "name": "descEng", "sku": "sku"}], "order_number": "67897", "pickups": undefined, "shipments": [{"attributes": {"1-deliveryItemLastModifiedDate": 1000000000000, "deliveryLastModifiedDate": "2001-09-09T01:46:40.000Z", "extRefId-deliveryItemLastModifiedDate": "2001-09-09T01:46:40.000Z"}, "carrier": undefined, "carrier_service": null, "items_info": [{"item_id": "extRefId", "quantity": 1, "sku": "sku"}], "ship_date": "2001-09-09T01:46:40.000Z", "ship_method": undefined, "shipped_from": {"id": null, "address": {"city": "fromCity", "country": "fromCountryId", "state": "fromStateId", "street_1": "fromAddress1", "street_2": "fromAddress2", "zip": "fromZipCode"}, "first_name": "fromStoreName", "phone": "fromHomePhone"}, "shipped_to": {"address": {"city": "city", "country": "countryId", "state": "stateId", "street_1": "address1", "street_2": "address2", "zip": "zipCode"}, "email": "emailAddress", "first_name": "firstName", "last_name": "lastName", "phone": "homePhone"}, "tracking_number": "trackingNumber"}]}})
  });
  it('merge inbound order with narvar order but the narvar order has newer pickups; should not update the pickups but update the rest', () => {
    const narvarOrder = { order_info: { ...bopisOrders[0].order_info, attributes: { [NARVAR_ORDER_LAST_MODIFIED]: 1000000000001 }, order_items: [{ ...bopisOrders[0].order_info.order_items[0], attributes: { [NARVAR_ORDER_ITEM_LAST_MODIFIED]: 1000000000001, [NARVAR_DELIVERY_ITEM_LAST_MODIFIED]: 1000000000001 } }], pickups: [{ ...bopisOrders[0].order_info.pickups[0], items_info: [{ ...bopisOrders[0].order_info.pickups[0].items_info[0] }] }] } }
    const result = mergeNarvarOrderWithDeliveries(bopisOrders[0], narvarOrder)
    expect(result).toEqual({"order_info": {"attributes": {"orderLastModifiedDate": 1000000000001}, "order_date": "2001-09-09T01:46:40.000Z", "order_items": [{"attributes": {"deliveryItemLastModifiedDate": 1000000000001, "orderItemLastModifiedDate": 1000000000001}, "fulfillment_type": "BOPIS", "item_id": "extRefId", "name": "descEng", "sku": "sku"}], "order_number": "67897", "pickups": [{"attributes": {"1-deliveryItemLastModifiedDate": 1000000000000, "deliveryLastModifiedDate": "2001-09-09T01:46:40.000Z", "extRefId-deliveryItemLastModifiedDate": "2001-09-09T01:46:40.000Z"}, "carrier": undefined, "id": "shipmentId", "items_info": [{"item_id": "extRefId", "quantity": 1, "sku": "sku"}], "ship_date": "2001-09-09T01:46:40.000Z", "status": {"code": undefined, "date": "2001-09-09T01:46:40.000Z"}, "store": {"id": "siteId", "address": {"city": "fromCity", "country": "fromCountryId", "state": "fromStateId", "street_1": "fromAddress1", "street_2": "fromAddress2", "zip": "fromZipCode"}, "name": "fromStoreName", "phone_number": "fromHomePhone"}, "tracking_number": "trackingNumber", "type": "BOPIS"}], "shipments": undefined}})
  });
});
