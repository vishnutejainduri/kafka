const TOPIC_NAME = 'return-details-connect-jdbc';

function filterReturnDetailsMessages(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse return details create/update messages');
    }

    return true; 
}

function parseReturnDetailsMessage(msg) {
    const returnDetail = {
        returnId: msg.value.RETURN_ID.toString(),
        siteId: msg.value.SITE_ID,
        line: msg.value.LINE.toString(),
        businessUnitId: msg.value.BUSINESS_UNIT_ID.toString(),
        shipmentId: msg.value.SHIPMENT_ID.toString(),
        orderNumber: msg.value.ORDER_NUMBER,
        quantityReturned: msg.value.QTY_RETURNED,
        lineItemId: msg.value.EXT_REF_ID,
        returnDetailLastModifiedDate: new Date(msg.value.MODIFIED_DATE)
    };

    returnDetail.returnDetailId = `${returnDetail.returnId}-${returnDetail.siteId}-${returnDetail.line}-${returnDetail.businessUnitId}`
    return returnDetail;
}

module.exports = {
    parseReturnDetailsMessage,
    filterReturnDetailsMessages
};
