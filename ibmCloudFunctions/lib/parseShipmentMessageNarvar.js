const {  
  log
} = require('../product-consumers/utils');
const {
  NARVAR_FULFILLMENT_TYPES,
  JESTA_CARRIER_ID_TO_NARVAR_CARRIER_ID,
  JESTA_SERVICE_TYPES_TO_NARVAR_SERVICE_TYPES,
  NARVAR_SHIPMENT_LAST_MODIFIED,
  NARVAR_SHIPMENT_ITEM_LAST_MODIFIED,
  NARVAR_ORDER_LAST_MODIFIED,
  NARVAR_ORDER_ITEM_LAST_MODIFIED
} = require('../narvar/constantsNarvar') 
const TOPIC_NAMES = ['shipment-details-connect-jdbc', 'shipments-connect-jdbc']

function filterShipmentMessages(msg) {
    if (!TOPIC_NAMES.includes(msg.topic)) {
        throw new Error('Can only parse Shipment update messages');
    }

    return true; 
}

function filterMissingTrackingNumberMessages(msg) {
    if (!msg.value.TRACKING_NUMBER) {
      log.error(`Shipment ${msg.value.SHIPMENT_ID} for order ${msg.value.ORDER_NUMBER} has no tracking number`)
      return false;
    }

    return true; 
}

function checkShipmentItemIdForNull(msg) {
    if (!msg.value.EXT_REF_ID) {
        // we want to skip messages with no line item id but not fail them since there's no point retrying. We log out a message here for alerting purposes
        log.error(`Cannot process messages with no line item id. Order number: ${msg.value.ORDER_NUMBER}`)
        return false;
    }

    return true; 
}

function parseShipmentMessage(msg) {
    return {
        order_info: {
          order_number: msg.value.ORDER_NUMBER,
          order_date: new Date(msg.value.ORDER_CREATED_DATE).toISOString(),
          attributes: {
            [NARVAR_ORDER_LAST_MODIFIED]: null,
          },
          order_items: [{
            item_id: msg.value.EXT_REF_ID,
            sku: msg.value.SKU,
            name: msg.value.LANGUAGE_NO === 1 ? msg.value.DESC_ENG : msg.value.DESC_FR,
            fulfillment_type: msg.value.DEST_SITE_ID ? NARVAR_FULFILLMENT_TYPES.BOPIS : NARVAR_FULFILLMENT_TYPES.HOME_DELIVERY,
            attributes: {
              [NARVAR_ORDER_ITEM_LAST_MODIFIED]: null,
              [NARVAR_SHIPMENT_ITEM_LAST_MODIFIED]: msg.value.MODIFIED_DATE ? new Date(msg.value.MODIFIED_DATE).toISOString() : null
            },
          }],
          shipments: [{
            attributes: {
              [NARVAR_SHIPMENT_LAST_MODIFIED]: msg.value.SHIPMENT_MODIFIED_DATE ? new Date(msg.value.SHIPMENT_MODIFIED_DATE).toISOString() : null,
              [`${msg.value.EXT_REF_ID}-${NARVAR_SHIPMENT_ITEM_LAST_MODIFIED}`]: msg.value.MODIFIED_DATE ? new Date(msg.value.MODIFIED_DATE).toISOString() : null
            },
            items_info: [{
              item_id: msg.value.EXT_REF_ID,
              sku: msg.value.SKU,
              quantity: msg.value.QTY_SHIPPED
            }],
            ship_method: msg.value.SERVICE_TYPE,
            ship_date: new Date(msg.value.SHIPPED_DATE).toISOString(),
            carrier: JESTA_CARRIER_ID_TO_NARVAR_CARRIER_ID[msg.value.CARRIER_ID],
            carrier_service: JESTA_SERVICE_TYPES_TO_NARVAR_SERVICE_TYPES[msg.value.CARRIER_ID] ? JESTA_SERVICE_TYPES_TO_NARVAR_SERVICE_TYPES[msg.value.CARRIER_ID][msg.value.SERVICE_TYPE] : null,
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
              email: msg.value.EMAIL_ADDRESS,
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
    parseShipmentMessage,
    filterShipmentMessages,
    filterMissingTrackingNumberMessages,
    checkShipmentItemIdForNull
};
