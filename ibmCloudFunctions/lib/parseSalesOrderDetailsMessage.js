const TOPIC_NAME = 'sales-order-details-connect-jdbc';

function filterSalesOrderDetailsMessages(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse Sales Order Details update messages');
    }

    return true; 
}

function parseSalesOrderDetailsMessage(msg) {
    return {
        orderNumber: msg.value.SALES_ORDER_ID,
        orderStatus: msg.value.STATUS,
        barcode: msg.value.BAR_CODE_ID,
        quantity: msg.value.QTY_ORDERED,
        orderLineLastModifiedDate: new Date(msg.value.MODIFIED_DATE)
    };
}

module.exports = {
    parseSalesOrderDetailsMessage,
    filterSalesOrderDetailsMessages
};
