const { JESTA_LANGUAGE_NUMBERS_TO_LOCALES, JESTA_STATUSES_TO_NARVAR_STATUSES } = require('../narvar/constantsNarvar') 
const { getItemImage, getItemUrl } = require('../narvar/narvarUtils') 
const TOPIC_NAME = 'sales-order-details-connect-jdbc';

function filterSalesOrderDetailsMessages(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse Sales Order Details update messages');
    }

    return true; 
}

function parseSalesOrderDetailsMessage(msg) {
    return {
        order_info: {
          order_number: msg.value.ORDER_NUMBER,
          order_status: JESTA_STATUSES_TO_NARVAR_STATUSES[msg.value.ORDER_STATUS],
          order_date: new Date(msg.value.ORDER_CREATED_DATE).toISOString(),
          checkout_locale: JESTA_LANGUAGE_NUMBERS_TO_LOCALES[msg.value.LANGUAGE_NO],
          currency_code: 'CAD',
          order_items: [{
            item_id: msg.value.EXT_REF_ID,
            fulfillment_status: JESTA_STATUSES_TO_NARVAR_STATUSES[msg.value.STATUS],
            is_gift: msg.value.GIFT_WRAP_IND === 'Y' ? true : false,
            item_image: getItemImage(msg.value.STYLEID),
            name: msg.value.LANGUAGE_NO === 1 ? msg.value.DESC_ENG : msg.value.DESC_FR,
            quantity: msg.value.QTY_ORDERED,
            sku: msg.value.SKU,
            unit_price: msg.value.UNIT_PRICE,
            line_price: msg.value.EXTENSION_AMOUNT,
            final_sale_date: new Date(msg.value.ORDER_CREATED_DATE).toISOString(),
            item_url: getItemUrl(msg.value.STYLEID, JESTA_LANGUAGE_NUMBERS_TO_LOCALES[msg.value.LANGUAGE_NO]),
            line_number: msg.value.LINE,
            attributes: {
              orderDetailLastModifiedDate: new Date(msg.value.MODIFIED_DATE).toISOString()
            }
          }],
          billing: {
            amount: msg.value.TRANSACTION_TOTAL,
            tax_total: msg.value.TAX_TOTAL,
            shipping_handling: msg.value.SHIPPING_CHARGES_TOTAL,
            payments: [{
              expiration_date: msg.value.EXPDATE.substr(0,2) + '/' + msg.value.EXPDATE.substr(2,2)
            }]
          }
        }
    };
}

module.exports = {
    parseSalesOrderDetailsMessage,
    filterSalesOrderDetailsMessages
};
