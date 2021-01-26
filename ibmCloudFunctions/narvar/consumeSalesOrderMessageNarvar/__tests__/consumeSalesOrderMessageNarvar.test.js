const consumeSalesOrderMessageNarvar = require('..');
const {
  filterSalesOrderMessages,
  parseSalesOrderMessage
} = require('../../../lib/parseSalesOrderMessageNarvar');
const {
  addErrorHandling,
} = require('../../../product-consumers/utils');
const {
  mergeNarvarItems,
  mergeNarvarOrder,
  mergeSalesOrderItems,
  mergeSalesOrders
} = require('../../narvarUtils') 

jest.mock('node-fetch');

const validParams = {
  topicName: 'sales-order-details-connect-jdbc',
  messages: [{
      topic: 'sales-order-details-connect-jdbc',
      value: {
        ORDER_NUMBER: '67897',
        STATUS: 'status',
        EXT_REF_ID: 'id',
        LINE: 1,
        QTY_CANCELLED: 1.0,
        MODIFIED_DATE: 1000000000000,
        CREATED_DATE: 1000000000000,
        ORDER_STATUS: 'orderStatus',
        ORDER_CREATED_DATE: 1000000000000,
        LANGUAGE_NO: 1,
        ORDER_MODIFIED_DATE: 1000000000000,
        GIFT_WRAP_IND: 'N',
        STYLEID: 'styleId',
        DESC_ENG: 'descEng',
        DESC_FR: 'descFr',
        QTY_ORDERED: 1.0,
        SKU: 'sku',
        UNIT_PRICE: 100.00,
        EXTENSION_AMOUNT: 100.00,
        TRANSACTION_TOTAL: 100.00,
        EXPDATE: '0000',
        TAX_TOTAL: 100.00,
        SHIPPING_CHARGES_TOTAL: 100.00,
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
  .filter(addErrorHandling(filterSalesOrderMessages))
  .map(addErrorHandling(parseSalesOrderMessage))

describe('consumeSalesOrderMessageNarvar', () => {
  it('Returns an error if given params are invalid', async () => {
    const invalidParams = {};
    return expect((await consumeSalesOrderMessageNarvar(invalidParams)).errorResult).toBeTruthy();
  });

  it('returns success result if given valid params and a valid message', async () => {
    const response = await consumeSalesOrderMessageNarvar(validParams);
    expect(response).toEqual({
      batchSuccessCount: 1,
      messagesCount: 1,
      ok: true,
      shouldResolveOffsets: 1
    });
  });

  it('returns success result if given valid params and a valid message; batch messages if same order number', async () => {
    const response = await consumeSalesOrderMessageNarvar({ ...validParams, messages: [{ ...validParams.messages[0] },{ ...validParams.messages[0] }] });
    expect(response).toEqual({
      batchSuccessCount: 1,
      messagesCount: 2,
      ok: true,
      shouldResolveOffsets: 1
    });
  });

  it('returns success result if given valid params and a valid message; don\'t batch messages if different order number', async () => {
    const response = await consumeSalesOrderMessageNarvar({ ...validParams, messages: [{ ...validParams.messages[0] },{ ...validParams.messages[0], value: { ...validParams.messages[0].value, ORDER_NUMBER: '11111' } }] });
    expect(response).toEqual({
      batchSuccessCount: 2,
      messagesCount: 2,
      ok: true,
      shouldResolveOffsets: 1
    });
  });
});

describe('filterSalesOrderMessages', () => {
  it('removes messages with wrong topic', async () => {
    const invalidMessages = { ...validParams, messages: [{ ...validParams.messages[0], topic: 'some-topic' }] }
    expect(() => filterSalesOrderMessages(invalidMessages.messages[0])).toThrow('Can only parse Sales Order Details update messages')
  });
  it('does not remove messages with correct topic', async () => {
    expect(filterSalesOrderMessages(validParams.messages[0])).toEqual(true)
  });
});

describe('parseSalesOrderMessage', () => {
  it('inbound jesta message transformed correctly', async () => {
    expect(parseSalesOrderMessage(validParams.messages[0])).toEqual({"order_info": {"attributes": {"orderLastModifiedDate": "2001-09-09T01:46:40.000Z"}, "billing": {"amount": 100, "billed_to": {"address": {"city": "city", "country": "countryId", "state": "stateId", "street_1": "address1", "street_2": "address2", "zip": "zipCode"}, "email": "emailAddress", "first_name": "firstName", "last_name": "firstName", "phone": "homePhone"}, "payments": [{"expiration_date": "00/00"}], "shipping_handling": 100, "tax_amount": 100}, "checkout_locale": "en-CA", "currency_code": "CAD", "customer": {"address": {"city": "city", "country": "countryId", "state": "stateId", "street_1": "address1", "street_2": "address2", "zip": "zipCode"}, "email": "emailAddress", "first_name": "firstName", "last_name": "firstName", "phone": "homePhone"}, "order_date": "2001-09-09T01:46:40.000Z", "order_items": [{"attributes": {"orderDetailLastModifiedDate": "2001-09-09T01:46:40.000Z"}, "final_sale_date": "2001-09-09T01:46:40.000Z", "fulfillment_status": undefined, "is_final_sale": false, "is_gift": false, "item_id": "id", "item_image": "https://i1.adis.ws/i/harryrosen/styleId?$prp-4col-xl$", "item_url": "https://harryrosen.com/en/product/styleId", "line_number": 1, "line_price": 100, "name": "descEng", "quantity": 1, "sku": "sku", "unit_price": 100}], "order_number": "67897", "status": undefined}})
  });
});

describe('mergeNarvarItems', () => {
  const orderItems = orders[0].order_info.order_items
  it('merging two empty items returns null since there are no needed changes', () => {
    const result = mergeNarvarItems([], [])
    expect(result).toEqual(null)
  });
  it('merging inbound items with no narvar items returns the inbound items', () => {
    const result = mergeNarvarItems(orderItems, [])
    expect(result).toEqual(orderItems)
  });
  it('merging no inbound items and one narvar item returns null since there are no needed changes', () => {
    const narvarItems = [{ ...orderItems[0] }]
    const result = mergeNarvarItems([], narvarItems)
    expect(result).toEqual(null)
  });
  it('merging two of the exact same items returns the single matching item', () => {
    const narvarItems = [{ ...orderItems[0] }]
    const result = mergeNarvarItems(orderItems, narvarItems)
    expect(result).toEqual(orderItems)
  });
  it('merging two of the exact same items except the inbound item is more recent; return inbound item', () => {
    const narvarItems = [{ ...orderItems[0], attributes: { orderDetailLastModifiedDate: '2000-09-09T01:46:40.000Z' } }]
    const result = mergeNarvarItems(orderItems, narvarItems)
    expect(result).toEqual(orderItems)
  });
  it('merging two of the exact same items except the inbound item is older; return null since no changes required', () => {
    const narvarItems = [{ ...orderItems[0], attributes: { orderDetailLastModifiedDate: '2002-09-09T01:46:40.000Z' } }]
    const result = mergeNarvarItems(orderItems, narvarItems)
    expect(result).toEqual(null)
  });
  it('merging two inbound items but only one is more recent than the narvar item', () => {
    const narvarItems = [{ ...orderItems[0], attributes: { orderDetailLastModifiedDate: '2000-09-09T01:46:40.000Z' } }]
    const newOrderItems = [{ ...orderItems[0] }, { ...orderItems[0], item_id: '1' }]
    const result = mergeNarvarItems(newOrderItems, narvarItems)
    expect(result).toEqual([newOrderItems[0], newOrderItems[1]])
  });
  it('merging two inbound items but only one is less recent than the narvar item', () => {
    const narvarItems = [{ ...orderItems[0], attributes: { orderDetailLastModifiedDate: '2002-09-09T01:46:40.000Z' } }]
    const newOrderItems = [{ ...orderItems[0] }, { ...orderItems[0], item_id: '1' }]
    const result = mergeNarvarItems(newOrderItems, narvarItems)
    expect(result).toEqual([narvarItems[0], newOrderItems[1]])
  });
  it('merging two inbound items with two narvar items where both inbound items are more recent', () => {
    const narvarItems = [{ ...orderItems[0], attributes: { orderDetailLastModifiedDate: '2000-09-09T01:46:40.000Z' } }, { ...orderItems[0], item_id: '1', attributes: { orderDetailLastModifiedDate: '2000-09-09T01:46:40.000Z' } }]
    const newOrderItems = [{ ...orderItems[0] }, { ...orderItems[0], item_id: '1' }]
    const result = mergeNarvarItems(newOrderItems, narvarItems)
    expect(result).toEqual([newOrderItems[0], newOrderItems[1]])
  });
  it('merging two inbound items with two narvar items where both inbound items are less recent; return null since no changes are required', () => {
    const narvarItems = [{ ...orderItems[0], attributes: { orderDetailLastModifiedDate: '2002-09-09T01:46:40.000Z' } }, { ...orderItems[0], item_id: '1', attributes: { orderDetailLastModifiedDate: '2002-09-09T01:46:40.000Z' } }]
    const newOrderItems = [{ ...orderItems[0] }, { ...orderItems[0], item_id: '1' }]
    const result = mergeNarvarItems(newOrderItems, narvarItems)
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
});

describe('mergeSalesOrderItems', () => {
  it('batch only contains 1 item and so just returns the 1 item', () => {
    const result = mergeSalesOrderItems(orders)
    expect(result).toEqual(orders[0].order_info.order_items)
  });
  it('batch only contains 2 items that are different; returns both items', () => {
    const newOrders = [{ order_info: { ...orders[0].order_info } }, { order_info: { ...orders[0].order_info, order_items: [{ ...orders[0].order_info.order_items[0], item_id: '1' }] } }]
    const result = mergeSalesOrderItems(newOrders)
    expect(result).toEqual([newOrders[0].order_info.order_items[0], newOrders[1].order_info.order_items[0]])
  });
  it('batch only contains 2 items that are the same; returns only 1 item', () => {
    const newOrders = [{ order_info: { ...orders[0].order_info } }, { order_info: { ...orders[0].order_info } }]
    const result = mergeSalesOrderItems(newOrders)
    expect(result).toEqual([newOrders[0].order_info.order_items[0]])
  });
  it('batch only contains 2 items that are the same but one is more recent; returns only the most recent item', () => {
    const newOrders = [{ order_info: { ...orders[0].order_info } }, { order_info: { ...orders[0].order_info, order_items: [{ ...orders[0].order_info.order_items[0], attributes: { orderDetailLastModifiedDate: '2002-09-09T01:46:40.000Z' } }] } }]
    const result = mergeSalesOrderItems(newOrders)
    expect(result).toEqual([newOrders[1].order_info.order_items[0]])
  });
  it('batch only contains 2 items that are the same but one is more recent and 1 item that is different; returns the most recent item and the different item', () => {
    const newOrders = [{ order_info: { ...orders[0].order_info } }, { order_info: { ...orders[0].order_info, order_items: [{ ...orders[0].order_info.order_items[0], attributes: { orderDetailLastModifiedDate: '2002-09-09T01:46:40.000Z' } }] } }, { order_info: { ...orders[0].order_info, order_items: [{ ...orders[0].order_info.order_items[0], item_id: '1' }] } } ]
    const result = mergeSalesOrderItems(newOrders)
    expect(result).toEqual([newOrders[1].order_info.order_items[0],newOrders[2].order_info.order_items[0]])
  });
});

describe('mergeSalesOrders', () => {
  it('batch only contains 1 order and so just returns the 1 order', () => {
    const result = mergeSalesOrders(orders)
    expect(result).toEqual(orders[0])
  });
  it('merging inbound order with another matching but older inbound order; return newer order', () => {
    const newInboundOrders = [{ order_info: { ...orders[0].order_info, attributes: { orderLastModifiedDate: '2002-09-09T01:46:40.000Z' } } }, { order_info: { ...orders[0].order_info } }]
    const result = mergeSalesOrders(newInboundOrders)
    expect(result).toEqual(newInboundOrders[0])
  });
  it('merging inbound order with another matching but newer inbound order; return newer order', () => {
    const newInboundOrders = [{ order_info: { ...orders[0].order_info } }, { order_info: { ...orders[0].order_info, attributes: { orderLastModifiedDate: '2000-09-09T01:46:40.000Z' } } }]
    const result = mergeSalesOrders(newInboundOrders)
    expect(result).toEqual(newInboundOrders[0])
  });
});
