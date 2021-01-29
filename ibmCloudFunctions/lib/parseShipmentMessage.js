const TOPIC_NAME = 'shipments-connect-jdbc';

function filterShipmentMessages(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse Shipment create/update messages');
    }

    return true; 
}

function parseShipmentMessage(msg) {
    return {
        carrierId: msg.value.CARRIER_ID,
        destinationSiteId: msg.value.DEST_SITE_ID,
        fillSiteId: msg.value.FILL_SITE_ID,
        fromZipCode: msg.value.FROM_ZIP_CODE,
        orderNumber: msg.value.ORDER_NUMBER,
        serviceType: msg.value.SERVICE_TYPE,
        shipmentId: msg.value.SHIPMENT_ID.toString(),
        shipmentLastModifiedDate: new Date(msg.value.MODIFIED_DATE)
    };
}

module.exports = {
    parseShipmentMessage,
    filterShipmentMessages
};
