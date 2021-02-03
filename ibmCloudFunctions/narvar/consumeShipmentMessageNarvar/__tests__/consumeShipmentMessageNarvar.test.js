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
  NARVAR_SHIPMENT_ITEM_LAST_MODIFIED,
  NARVAR_SHIPMENT_LAST_MODIFIED
} = require('../../constantsNarvar') 
const {
  mergeShipments,
  mergeShipmentItems,
  mergeNarvarItems,
  mergeFulfillmentType,
  mergeNarvarShipmentItems,
  mergeNarvarShipments
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
    expect(parseShipmentMessage(validParams.messages[0])).toEqual({"order_info": {"attributes": {"orderLastModifiedDate": null}, "order_date": "2001-09-09T01:46:40.000Z", "order_items": [{"attributes": {"orderItemLastModifiedDate": null, "shipmentItemLastModifiedDate": "2001-09-09T01:46:40.000Z"}, "fulfillment_type": "BOPIS", "item_id": "extRefId", "name": "descEng", "sku": "sku"}], "order_number": "67897", "shipments": [{"attributes": {"extRefId-shipmentItemLastModifiedDate": "2001-09-09T01:46:40.000Z", "shipmentLastModifiedDate": "2001-09-09T01:46:40.000Z"}, "carrier": undefined, "carrier_service": null, "items_info": [{"item_id": "extRefId", "quantity": 1, "sku": "sku"}], "ship_date": "2001-09-09T01:46:40.000Z", "ship_method": "serviceType", "shipped_from": {"address": {"city": "fromCity", "country": "fromCountryId", "state": "fromStateId", "street_1": "fromAddress1", "street_2": "fromAddress2", "zip": "fromZipCode"}, "first_name": "fromStoreName", "phone": "fromHomePhone"}, "shipped_to": {"address": {"city": "city", "country": "countryId", "state": "stateId", "street_1": "address1", "street_2": "address2", "zip": "zipCode"}, "email": "emailAddress", "first_name": "firstName", "last_name": "lastName", "phone": "homePhone"}, "tracking_number": "trackingNumber"}]}})
  });
});

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
  it('batch contains two shipments with two of the same items; should return most recent item only', () => {
    const shipments = [{ ...orders[0].order_info.shipments[0], items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] },{ ...orders[0].order_info.shipments[0], attributes: { [`extRefId-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000001 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }]
    const result = mergeShipmentItems(shipments, NARVAR_SHIPMENT_ITEM_LAST_MODIFIED)
    expect(result).toEqual([shipments[0].items_info[0]])
  });
});

describe('mergeShipments', () => {
  it('batch only contains 1 shipment and so just returns the 1 shipment', () => {
    const result = mergeShipments(orders)
    expect(result).toEqual(orders[0].order_info.shipments)
  });
  it('batch contains two different shipments; should return 2 shipments', () => {
    const newOrders = [{ order_info: { ...orders[0].order_info, shipments: [{ ...orders[0].order_info.shipments[0] },{ ...orders[0].order_info.shipments[0], tracking_number: '1' }] } }]
    const result = mergeShipments(newOrders)
    expect(result).toEqual([newOrders[0].order_info.shipments[0],newOrders[0].order_info.shipments[1]])
  });
  it('batch contains two of the same shipments; should return most recent shipment only', () => {
    const newOrders = [{ order_info: { ...orders[0].order_info, shipments: [{ ...orders[0].order_info.shipments[0] },{ ...orders[0].order_info.shipments[0], attributes: { [NARVAR_SHIPMENT_LAST_MODIFIED]: 1000000000001 } }] } }]
    const result = mergeShipments(newOrders)
    expect(result).toEqual([newOrders[0].order_info.shipments[1]])
  });
  it('batch contains two of the same shipments but different shipment items; should return 1 shipment with both items', () => {
    const newOrder1 = { order_info: { ...orders[0].order_info, shipments: [{ ...orders[0].order_info.shipments[0], attributes: { [`1-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000000 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0], item_id: '1' }] }] } }
    const newOrder2 = { order_info: { ...orders[0].order_info, shipments: [{ ...orders[0].order_info.shipments[0] }] } }
    const result = mergeShipments([newOrder1,newOrder2])
    expect(result).toEqual([{ ...orders[0].order_info.shipments[0], items_info: [newOrder2.order_info.shipments[0].items_info[0], newOrder1.order_info.shipments[0].items_info[0]] }])
  });
});

describe('mergeNarvarItems', () => {
  it('batch contains 1 line item; update 1 line item\'s fulfillment type', () => {
    const narvarOrder = { ...orders[0] }
    const result = mergeNarvarItems({
      mergedSalesOrderItems: orders[0].order_info.order_items,
      existingNarvarOrderItems: narvarOrder.order_info.order_items,
      compareDateField: NARVAR_SHIPMENT_ITEM_LAST_MODIFIED,
      mergeNarvarItem: mergeFulfillmentType
    })
    expect(result).toEqual([{ ...narvarOrder.order_info.order_items[0], fulfillment_type: 'BOPIS' }])
  });
  it('batch contains 1 line item which doesn\'t exist in narvar; should create line item', () => {
    const narvarOrder = { order_info: { ...orders[0].order_info, order_items: [] } }
    const result = mergeNarvarItems({
      mergedSalesOrderItems: orders[0].order_info.order_items,
      existingNarvarOrderItems: narvarOrder.order_info.order_items,
      compareDateField: NARVAR_SHIPMENT_ITEM_LAST_MODIFIED,
      mergeNarvarItem: mergeFulfillmentType
    })
    expect(result).toEqual([{ ...orders[0].order_info.order_items[0], fulfillment_type: 'BOPIS' }])
  });
  it('batch contains 1 line item which does exist in narvar but narvar\'s item is more recent; should do no updates', () => {
    const narvarOrder = { order_info: { ...orders[0].order_info, order_items: [{ ...orders[0].order_info.order_items[0], attributes: { [NARVAR_SHIPMENT_ITEM_LAST_MODIFIED]: 1000000000001 } }] } }
    const result = mergeNarvarItems({
      mergedSalesOrderItems: orders[0].order_info.order_items,
      existingNarvarOrderItems: narvarOrder.order_info.order_items,
      compareDateField: NARVAR_SHIPMENT_ITEM_LAST_MODIFIED,
      mergeNarvarItem: mergeFulfillmentType
    })
    expect(result).toEqual(null)
  });
  it('batch contains 2 line items one which doesn\'t exist in narvar the other does and is more recent; should return three line items, a new one for narvar and the most recent of the matching ones', () => {
    const narvarOrder = { order_info: { ...orders[0].order_info, order_items: [{ ...orders[0].order_info.order_items[0], item_id: '2' },{ ...orders[0].order_info.order_items[0] }] } }
    const inboundOrder = { order_info: { ...orders[0].order_info, order_items: [{ ...orders[0].order_info.order_items[0], attributes: { [NARVAR_SHIPMENT_ITEM_LAST_MODIFIED]: 1000000000001 }, item_id: '2' },{ ...orders[0].order_info.order_items[0], item_id: '1' }] } }
    const result = mergeNarvarItems({
      mergedSalesOrderItems: inboundOrder.order_info.order_items,
      existingNarvarOrderItems: narvarOrder.order_info.order_items,
      compareDateField: NARVAR_SHIPMENT_ITEM_LAST_MODIFIED,
      mergeNarvarItem: mergeFulfillmentType
    })
    expect(result).toEqual([{ ...narvarOrder.order_info.order_items[1] },{ ...narvarOrder.order_info.order_items[0], fulfillment_type: 'BOPIS', attributes: { ...narvarOrder.order_info.order_items[0].attributes, [NARVAR_SHIPMENT_ITEM_LAST_MODIFIED]: 1000000000001 } }, { ...inboundOrder.order_info.order_items[1] }])
  });
});

describe('mergeNarvarShipmentItems', () => {
  it('inbound 1 shipment item but narvar\'s shipment item is more recent; do no update', () => {
    const inboundShipment = { ...orders[0].order_info.shipments[0], items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }
    const narvarShipment = { ...orders[0].order_info.shipments[0], attributes: { [`extRefId-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000001 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }
    const result = mergeNarvarShipmentItems(inboundShipment, narvarShipment)
    expect(result).toEqual(null)
  });
  it('inbound 1 shipment item more recent than narvar\'s shipment item; update one shipment item', () => {
    const inboundShipment = { ...orders[0].order_info.shipments[0], attributes: { [`extRefId-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000001 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }
    const narvarShipment = { ...orders[0].order_info.shipments[0], items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }
    const result = mergeNarvarShipmentItems(inboundShipment, narvarShipment)
    expect(result).toEqual({
      shipmentItems: [{ ...inboundShipment.items_info[0] }],
      shipmentItemLastModifiedDates: { [`extRefId-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000001 }
    })
  });
  it('inbound 1 shipment item that doesn\'t exist in narvar; keep narvar item add new inbound item', () => {
    const inboundShipment = { ...orders[0].order_info.shipments[0], attributes: { [`1-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000001 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0], item_id: '1' }] }
    const narvarShipment = { ...orders[0].order_info.shipments[0], items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }
    const result = mergeNarvarShipmentItems(inboundShipment, narvarShipment)
    expect(result).toEqual({
      shipmentItems: [{ ...narvarShipment.items_info[0] },{ ...inboundShipment.items_info[0] }],
      shipmentItemLastModifiedDates: { [`extRefId-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: '2001-09-09T01:46:40.000Z', [`1-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000001 }
    })
  });
  it('inbound 2 shipment items that one that is older than the narvar match and one that is more recent; keep narvar item that is newer and keep the inbound one that is newer', () => {
    const inboundShipment = { ...orders[0].order_info.shipments[0], attributes: { [`1-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000001, [`extRefId-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000000 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0], item_id: '1' },{ ...orders[0].order_info.shipments[0].items_info[0] }] }
    const narvarShipment = { ...orders[0].order_info.shipments[0], attributes: { [`1-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000000, [`extRefId-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000001 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0], item_id: '1' },{ ...orders[0].order_info.shipments[0].items_info[0] }] }
    const result = mergeNarvarShipmentItems(inboundShipment, narvarShipment)
    expect(result).toEqual({
      shipmentItems: [{ ...narvarShipment.items_info[1] },{ ...inboundShipment.items_info[0] }],
      shipmentItemLastModifiedDates: { [`extRefId-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000001, [`1-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000001 }
    })
  });
});

describe('mergeNarvarShipments', () => {
  it('inbound shipment and it\'s items are older than the ones in narvar; no updates', () => {
    const inboundShipments = [{ ...orders[0].order_info.shipments[0], items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }]
    const narvarShipments = [{ ...orders[0].order_info.shipments[0], attributes: { [`extRefId-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000001, [NARVAR_SHIPMENT_LAST_MODIFIED]: 1000000000001 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }]
    const result = mergeNarvarShipments(inboundShipments, narvarShipments)
    expect(result).toEqual(null)
  });
  it('inbound shipment doesn\'t exist in narvar; should keep existing narvar shipment but add inbound shipment', () => {
    const inboundShipments = [{ ...orders[0].order_info.shipments[0], tracking_number: '1', items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }]
    const narvarShipments = [{ ...orders[0].order_info.shipments[0], items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }]
    const result = mergeNarvarShipments(inboundShipments, narvarShipments)
    expect(result).toEqual([{ ...narvarShipments[0] }, { ...inboundShipments[0] }])
  });
  it('inbound shipment and it\'s items are both more recent than narvar\'s; should update replacing shipment with inbound', () => {
    const inboundShipments = [{ ...orders[0].order_info.shipments[0], attributes: { [`extRefId-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000001, [NARVAR_SHIPMENT_LAST_MODIFIED]: 1000000000001 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }]
    const narvarShipments = [{ ...orders[0].order_info.shipments[0], items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }]
    const result = mergeNarvarShipments(inboundShipments, narvarShipments)
    expect(result).toEqual([{ ...inboundShipments[0] }])
  });
  it('inbound shipment is more recent than narvar but the narvar shipment items are more recent; should update with inbound shipment but keep narvar shipment items', () => {
    const inboundShipments = [{ ...orders[0].order_info.shipments[0], attributes: { [`extRefId-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000000, [NARVAR_SHIPMENT_LAST_MODIFIED]: 1000000000001 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }]
    const narvarShipments = [{ ...orders[0].order_info.shipments[0], attributes: { [`extRefId-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000001, [NARVAR_SHIPMENT_LAST_MODIFIED]: 1000000000000 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0], quantity: 99 }] }]
    const result = mergeNarvarShipments(inboundShipments, narvarShipments)
    expect(result).toEqual([{ ...inboundShipments[0], attributes: { ...inboundShipments[0].attributes, [`extRefId-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000001 }, items_info: [{ ...narvarShipments[0].items_info[0] }] }])
  });
  it('inbound shipment is older than narvar but the inbound shipment items are more recent; should update with inbound shipment items but keep narvar shipment header', () => {
    const inboundShipments = [{ ...orders[0].order_info.shipments[0], attributes: { [`extRefId-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000001, [NARVAR_SHIPMENT_LAST_MODIFIED]: 1000000000000 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0] }] }]
    const narvarShipments = [{ ...orders[0].order_info.shipments[0], ship_date: 1000000000000, attributes: { [`extRefId-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000000, [NARVAR_SHIPMENT_LAST_MODIFIED]: 1000000000001 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0], quantity: 99 }] }]
    const result = mergeNarvarShipments(inboundShipments, narvarShipments)
    expect(result).toEqual([{ ...narvarShipments[0], attributes: { ...narvarShipments[0].attributes, [`extRefId-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000001 }, items_info: [{ ...inboundShipments[0].items_info[0] }] }])
  });
  it('BIG COMPOUND TEST: inbound shipments are 2 shipments each with 2 shipment items; the 1st shipment is more recent than narvar but one shipment item does not yet exist in narvar; the 2nd shipment is older tha narvar but one of it\'s shipment items are more recent; should output 2 shipments, one being the narvar shipment header, and merged line items between narvar and inbound shipment lines', () => {
    const inboundShipments = [{ ...orders[0].order_info.shipments[0], tracking_number: '1', ship_date: 1000000000001, attributes: { [`1-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000001, [`2-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000001, [NARVAR_SHIPMENT_LAST_MODIFIED]: 1000000000001 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0], item_id: '1', quantity: 1 },{ ...orders[0].order_info.shipments[0].items_info[0], item_id: '2', quantity: 2 }] }, { ...orders[0].order_info.shipments[0], tracking_number: '2', ship_date: 1000000000002, attributes: { [`3-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000001, [`4-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000001, [NARVAR_SHIPMENT_LAST_MODIFIED]: 1000000000000 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0], item_id: '3', quantity: 3 },{ ...orders[0].order_info.shipments[0].items_info[0], item_id: '4', quantity: 4 }] } ]
    const narvarShipments = [{ ...orders[0].order_info.shipments[0], tracking_number: '1', ship_date: 1000000000003, attributes: { [`1-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000000, [NARVAR_SHIPMENT_LAST_MODIFIED]: 1000000000000 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0], item_id: '1', quantity: 11 }] }, { ...orders[0].order_info.shipments[0], tracking_number: '2', ship_date: 1000000000006, attributes: { [`3-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000005, [`4-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000000, [NARVAR_SHIPMENT_LAST_MODIFIED]: 1000000000001 }, items_info: [{ ...orders[0].order_info.shipments[0].items_info[0], item_id: '3', quantity: 33 },{ ...orders[0].order_info.shipments[0].items_info[0], item_id: '4', quantity: 44 }] } ]
    const result = mergeNarvarShipments(inboundShipments, narvarShipments)
    expect(result).toEqual([{ ...inboundShipments[0], attributes: { ...inboundShipments[0].attributes, [`1-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000001, [`2-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000001 }, items_info: [{ ...inboundShipments[0].items_info[0] },{ ...inboundShipments[0].items_info[1] }] }, { ...narvarShipments[1], attributes: { ...narvarShipments[1].attributes, [`3-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000005, [`4-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: 1000000000001 }, items_info: [{ ...narvarShipments[1].items_info[0] },{ ...inboundShipments[1].items_info[1] }] }])
  });
});
