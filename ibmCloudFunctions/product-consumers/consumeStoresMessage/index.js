const getCollection = require('../../lib/getCollection');
const { addErrorHandling, log, createLog } = require('../utils');
const createError = require('../../lib/createError');
const { HIDDEN_STORES } = require('../../lib/constants');
const OUTLET_ID = "3";

const parseStoreMessage = function (msg) {
    return {
        _id: msg.value.SITE_ID,
        id: msg.value.SITE_ID,
        businessUnitId: msg.value.BUSINESS_UNIT_ID,
        subType: msg.value.SUB_TYPE,
        daysOpenPerWeek: msg.value.DAYS_OPEN_PER_WEEK,
        name: msg.value.NAME,
        address1: msg.value.ADDRESS_1,
        address2: msg.value.ADDRESS_2,
        address3: msg.value.ADDRESS_3,
        address4: msg.value.ADDRESS_4,
        city: msg.value.CITY,
        stateId: msg.value.STATE_ID,
        countryId: msg.value.COUNTRY_ID,
        zipCode: msg.value.ZIP_CODE,
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

global.main = async function (params) {
    log(createLog.params('consumeStoresMessage', params));
    // messages is not used, but paramsExcludingMessages is used
    // eslint-disable-next-line no-unused-vars
    const { messages, ...paramsExcludingMessages } = params;

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    let stores;
    try {
        stores = await getCollection(params);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    return Promise.all(params.messages
        .filter(addErrorHandling((msg) => msg.topic === params.topicName))
        .map(addErrorHandling(parseStoreMessage))
        .map(addErrorHandling((storeData) => stores.updateOne({ _id: storeData._id }, { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set: storeData }, { upsert: true })
            .then(() => log('Updated/inserted store ' + storeData._id))
            .catch(originalError => {
                return createError.consumeStoresMessage.failedToUpdateStore(originalError, storeData._id);
            })
        ))
    )
    .then((results) => {
        const errors = results.filter((res) => res instanceof Error);
        if (errors.length > 0) {
            const e = new Error(`${errors.length} of ${results.length} updates failed. See 'failedUpdatesErrors'.`);
            e.failedUpdatesErrors = errors;
            e.successfulUpdatesResults = results.filter((res) => !(res instanceof Error));
            throw e;
        }
    })
    .catch(originalError => {
        throw createError.consumeStoresMessage.failed(originalError, paramsExcludingMessages);
    });
}

module.exports = global.main;
