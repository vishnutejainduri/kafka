const {
  JESTA_LANGUAGE_NUMBERS_TO_LOCALES,
  JESTA_STATUSES_TO_NARVAR_STATUSES,
  NARVAR_ORDER_LAST_MODIFIED,
  NARVAR_ORDER_ITEM_LAST_MODIFIED
} = require('../narvar/constantsNarvar') 
const { getItemImage, getItemUrl } = require('../narvar/narvarUtils') 
const TOPIC_NAMES = ['sales-order-details-connect-jdbc', 'sales-orders-connect-jdbc']

function filterSalesOrderMessages(msg) {
    if (!TOPIC_NAMES.includes(msg.topic)) {
        throw new Error('Can only parse Sales Order Details update messages');
    }

    return true; 
}

function parseSalesOrderMessage(msg) {
    return {
        order_info: {
          order_number: msg.value.ORDER_NUMBER,
          status: JESTA_STATUSES_TO_NARVAR_STATUSES[msg.value.ORDER_STATUS],
          order_date: new Date(msg.value.ORDER_CREATED_DATE).toISOString(),
          checkout_locale: JESTA_LANGUAGE_NUMBERS_TO_LOCALES[msg.value.LANGUAGE_NO],
          currency_code: 'CAD',
          attributes: {
            [NARVAR_ORDER_LAST_MODIFIED]: msg.value.ORDER_MODIFIED_DATE ? new Date(msg.value.ORDER_MODIFIED_DATE).toISOString() : null
          },
          order_items: [{
            item_id: msg.value.EXT_REF_ID,
            categories: [msg.value.CATEGORY_LEVEL_2A_EN],
            vendors: [{
              name: msg.value.EA_IND === 'Y' ? 'EA' : 'HR'
            }],
            fulfillment_status: JESTA_STATUSES_TO_NARVAR_STATUSES[msg.value.STATUS],
            is_gift: msg.value.GIFT_WRAP_IND === 'Y' ? true : false,
            item_image: getItemImage(msg.value.STYLEID),
            name: msg.value.LANGUAGE_NO === 1 ? msg.value.DESC_ENG : msg.value.DESC_FR,
            quantity: msg.value.QTY_ORDERED,
            sku: msg.value.SKU,
            unit_price: msg.value.UNIT_PRICE,
            line_price: msg.value.EXTENSION_AMOUNT,
            final_sale_date: msg.value.ORDER_CREATED_DATE ? new Date(msg.value.ORDER_CREATED_DATE).toISOString() : null,
            item_url: getItemUrl(msg.value.STYLEID, JESTA_LANGUAGE_NUMBERS_TO_LOCALES[msg.value.LANGUAGE_NO]),
            is_final_sale: msg.value.RETURNABLE_IND === 'Y' ? false : true,
            line_number: msg.value.LINE,
            attributes: {
              [NARVAR_ORDER_ITEM_LAST_MODIFIED]: msg.value.MODIFIED_DATE ? new Date(msg.value.MODIFIED_DATE).toISOString() : null,
              brand_name: msg.value.BRAND_NAME_ENG,
              size: msg.value.SIZE
            }
          }],
          billing: {
            billed_to: {
              email: msg.value.EMAIL_ADDRESS,
              first_name: msg.value.FIRST_NAME,
              last_name: msg.value.FIRST_NAME,
              phone: msg.value.HOME_PHONE,
              address: {
                street_1: msg.value.ADDRESS_1,
                street_2: msg.value.ADDRESS_2,
                city: msg.value.CITY,
                state: msg.value.STATE_ID,
                zip: msg.value.ZIP_CODE,
                country: msg.value.COUNTRY_ID
              },
            },
            amount: msg.value.TRANSACTION_TOTAL,
            tax_amount: msg.value.TAX_TOTAL,
            shipping_handling: msg.value.SHIPPING_CHARGES_TOTAL
          },
          customer: {
            customer_id: msg.value.LRUID,
            email: msg.value.EMAIL_ADDRESS,
            first_name: msg.value.FIRST_NAME,
            last_name: msg.value.FIRST_NAME,
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
        }
    };
}

module.exports = {
    parseSalesOrderMessage,
    filterSalesOrderMessages
};
