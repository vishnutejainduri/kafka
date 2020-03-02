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
        stateId: msg.value.STATE,
        zipCode: msg.value.POSTALZIP,
        latitude: msg.value.LATITUDE,
        longitude: msg.value.LONGITUDE,
        canOnlineFulfill: msg.value.FULFILL_STATUS === 'Y' ? true : false,
        canFulfillDep27: msg.value.DEP27_FULFILL_STATUS === 'Y' ? true : false,
        canPickup: msg.value.PICKUP_STATUS === 'Y' ? true : false,
        storeLookupStatus: msg.value.STORELOOKUP_STATUS === 'Y' ? true : false,
        lastModifiedDate: msg.value.LASTMODIFIEDDATE
    };
};

module.exports = {
    parseStoreMessage,
    filterStoreMessage
};
