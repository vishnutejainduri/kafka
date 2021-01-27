const TOPIC_NAME = 'sales-orders-connect-jdbc';

function filterSalesOrderMessages(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse Sales Order update messages');
    }

    return true; 
}

function parseSalesOrderMessage(msg) {
    return {
        orderNumber: msg.value.ORDER_NUMBER,
        orderStatus: msg.value.ORDER_STATUS,
        orderLastModifiedDate: new Date(msg.value.ORDER_MODIFIED_DATE)
    };
}

module.exports = {
    parseSalesOrderMessage,
    filterSalesOrderMessages
};
