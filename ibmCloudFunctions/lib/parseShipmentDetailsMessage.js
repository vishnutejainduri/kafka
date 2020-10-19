const TOPIC_NAME = 'shipment-details-connect-jdbc';

function filterShipmentDetailsMessages(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse shipment details create/update messages');
    }

    return true; 
}

function parseShipmentDetailsMessage(msg) {
    const shipmentDetail = {
        shipmentId: msg.value.SHIPMENT_ID.toString(),
        siteId: msg.value.SITE_ID,
        line: msg.value.LINE.toString(),
        businessUnitId: msg.value.BUSINESS_UNIT_ID.toString(),
        status: msg.value.STATUS,
        orderNumber: msg.value.ORDER_NUMBER,
        trackingNumber: msg.value.TRACKING_NUMBER,
        carrierId: msg.value.CARRIER_ID,
        quantityShipped: msg.value.QTY_SHIPPED,
        lineItemId: msg.value.EXT_REF_ID,
        shipmentDetailLastModifiedDate: new Date(msg.value.MODIFIED_DATE)
    };

    shipmentDetail.shipmentDetailId = `${shipmentDetail.shipmentId}-${shipmentDetail.siteId}-${shipmentDetail.line}-${shipmentDetail.businessUnitId}`
    return shipmentDetail;
}

module.exports = {
    parseShipmentDetailsMessage,
    filterShipmentDetailsMessages
};
