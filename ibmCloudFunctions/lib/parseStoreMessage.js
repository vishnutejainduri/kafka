'use strict';

const TOPIC_NAME = 'stores-connect-jdbc';
const OUTLET_ID = "3";

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

    const storeObj = {
        _id: msg.value.SITE_ID,
        id: msg.value.SITE_ID,
        name: msg.value.NAME,
        address1: msg.value.ADDRESS1,
        address2: msg.value.ADDRESS2,
        city: msg.value.CITY,
        stateId: msg.value.STATE,
        zipCode: msg.value.POSTALZIP,
        telephone: msg.value.PHONE,
        latitude: msg.value.LATITUDE,
        longitude: msg.value.LONGITUDE,
        canOnlineFulfill: msg.value.FULFILL_STATUS === 'Y' ? true : false,
        canFulfillDep27: msg.value.DEP27_FULFILL_STATUS === 'Y' ? true : false,
        canPickup: msg.value.PICKUP_STATUS === 'Y' ? true : false,
        storeLookupStatus: msg.value.STORELOOKUP_STATUS === 'Y' ? true : false,
        daysOpenPerWeek: msg.value.DAYS_OPEN_PER_WEEK,
        isOutlet: msg.value.ZONE_ID === OUTLET_ID,
        dateClosed: msg.value.DATE_CLOSED,
        posEnabled: msg.value.POS_ENABLED === 'Y' ? true : false,
        subType: msg.value.SUB_TYPE,
        lastModifiedDate: msg.value.LASTMODIFIEDDATE
    };

    const currentDate = new Date().getTime();

    storeObj['isVisible'] = storeObj.isOutlet
                            ? false
                            : !storeObj.isOutlet && storeObj.posEnabled && (currentDate < storeObj.dateClosed || storeObj === null)
                              ? true
                              : false
    return storeObj;
}

module.exports = {
    parseStoreMessage,
    filterStoreMessage
};
