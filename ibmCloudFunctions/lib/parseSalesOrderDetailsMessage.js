const TOPIC_NAME = 'sales-order-details-connect-jdbc';

function filterSalesOrderDetailsMessages(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse Sales Order Details update messages');
    }

    return true; 
}

function parseSalesOrderDetailsMessage(msg) {
    return {
        id: msg.value.EXT_REF_ID,
        orderNumber: msg.value.ORDER_NUMBER,
        orderDetailId: `${msg.value.ORDER_NUMBER}-${msg.value.EXT_REF_ID}`,
        orderStatus: msg.value.STATUS,
        orderDetailLastModifiedDate: new Date(msg.value.MODIFIED_DATE)
    };
}

module.exports = {
    parseSalesOrderDetailsMessage,
    filterSalesOrderDetailsMessages
};
