const getCollection = require('../../lib/getCollection');
const { HIDDEN_STORES } = require('../../lib/constants');

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
        isVisible: HIDDEN_STORES.indexOf(msg.value.SITE_ID) < 0
    };
};

global.main = async function (params) {
    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    const stores = await getCollection(params);
    return Promise.all(params.messages
        .filter((msg) => msg.topic === params.topicName)
        .map(parseStoreMessage)
        .map((storeData) => stores.updateOne({ _id: storeData._id }, { $set: storeData }, { upsert: true })
            .then(() => console.log('Updated/inserted store ' + storeData._id))
            .catch((err) => {
                console.error('Problem with store ' + storeData._id);
                console.error(err);
                if (!(err instanceof Error)) {
                    const e = new Error();
                    e.originalError = err;
                    e.attemptedDocument = storeData;
                    return e;
                }

                err.attemptedDocument = storeData;
                return err;
            })
        )
    ).then((results) => {
        const errors = results.filter((res) => res instanceof Error);
        if (errors.length > 0) {
            const e = new Error('Some updates failed. See `results`.');
            e.results = results;
            throw e;
        }
    });
}

module.exports = global.main;
