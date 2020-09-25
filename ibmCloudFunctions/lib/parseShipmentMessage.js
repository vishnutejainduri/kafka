const TOPIC_NAME = 'shipments-connect-jdbc';

function filterShipmentMessages(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse Shipment create/update messages');
    }

    return true; 
}

function parseShipmentMessage(msg) {
    return {
        orderNumber: msg.value.ORDER_NUMBER,
        shipmentId: msg.value.SHIPMENT_ID,
        serviceType: msg.value.SERVICE_TYPE,
        destinationSiteId: msg.value.DEST_SITE_ID,
        shipmentLastModifiedDate: new Date(msg.value.MODIFIED_DATE)
    };
}

module.exports = {
    parseShipmentMessage,
    filterShipmentMessages
};
