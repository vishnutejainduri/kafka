'use strict';

const TOPIC_NAME = 'stores-connect-jdbc';

function filterStoreMessage(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse store update messages');
    }

    return true;
}

function parseStoreMessage(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse store update messages');
    }

    return {
        _id: msg.value.SITE_ID,
        id: msg.value.SITE_ID,
        name: msg.value.NAME,
        address1: msg.value.ADDRESS1,
        address2: msg.value.ADDRESS2,
        city: msg.value.CITY,
        state: msg.value.STATE,
        postalZip: msg.value.POSTALZIP,
        telephone: msg.value.TELEPHONE,
        fax: msg.value.FAX,
        latitude: msg.value.LATITUDE,
        longitude: msg.value.LONGITUDE,
        operationalStatus: msg.value.OPERATIONAL_STATUS,
        siteMgrEmployeeId: msg.value.SITE_MGR_EMPLOYEE_ID,
        siteMgrSubType: msg.value.SITE_MGR_SUB_TYPE,
        isVisible: !HIDDEN_STORES.includes(msg.value.SITE_ID),
        isOutlet: msg.value.ZONE_ID === OUTLET_ID
    };
};

module.exports = {
    parseStoreMessage,
    filterStoreMessage
};
