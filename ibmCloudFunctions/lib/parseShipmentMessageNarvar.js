const {
  NARVAR_FULFILLMENT_TYPES
} = require('../narvar/constantsNarvar') 
const TOPIC_NAME = 'shipment-details-connect-jdbc';

function filterSalesOrderMessages(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse Shipment update messages');
    }

    return true; 
}

function parseSalesOrderMessage(msg) {
    return {
        order_info: {
          order_number: msg.value.ORDER_NUMBER,
          order_items: [{
            item_id: msg.value.EXT_REF_ID,
            sku: msg.value.SKU,
            fulfillment_type: msg.value.DEST_SITE_ID ? NARVAR_FULFILLMENT_TYPES.BOPIS : NARVAR_FULFILLMENT_TYPES.HOME_DELIVERY
          }]
          shipments: [{
            items_info: [{
              item_id: msg.value.EXT_REF_ID,
              sku: msg.value.SKU,
              quantity: msg.value.QTY_SHIPPED
            }],
            ship_method: msg.value.SERVICE_TYPE,
            carrier: msg.value.CARRIER_ID,
            carrier_service: msg.value.SERVICE_TYPE,
            tracking_number: msg.value.TRACKING_NUMBER,
            shipped_from: {
              first_name: msg.value.FROM_STORE_NAME,
              phone: msg.value.FROM_HOME_PHONE,
              address: {
                street_1: msg.value.FROM_ADDRESS_1,
                street_2: msg.value.FROM_ADDRESS_2,
                city: msg.value.FROM_CITY,
                state: msg.value.FROM_STATE_ID,
                zip: msg.value.FROM_ZIP_CODE,
                country: msg.value.FROM_COUNTRY_ID
              }
            },
            shipped_to: {
              first_name: msg.value.FIRST_NAME,
              last_name: msg.value.LAST_NAME,
              email: null,
              phone: msg.value.HOME_PHONE,
              address: {
                street_1: msg.value.ADDRESS_1,
                street_2: msg.value.ADDRESS_2,
                city: msg.value.CITY,
                state: msg.value.STATE_ID,
                zip: msg.value.ZIP_CODE,
                country: msg.value.COUNTRY_ID
              }
            }
          }]
        }
    };
}

module.exports = {
    parseSalesOrderMessage,
    filterSalesOrderMessages
};
