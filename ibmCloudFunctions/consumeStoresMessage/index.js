const getCollection = require('../lib/getCollection');

const parseStoreMessage = function (msg) {
    return {
        _id: msg.SITE_ID,
        id: msg.SITE_ID,
        businessUnitId: msg.BUSINESS_UNIT_ID,
        subType: msg.SUB_TYPE,
        daysOpenPerWeek: msg.DAYS_OPEN_PER_WEEK,
        name: msg.NAME,
        address1: msg.ADDRESS_1,
        address2: msg.ADDRESS_2,
        address3: msg.ADDRESS_3,
        address4: msg.ADDRESS_4,
        city: msg.CITY,
        stateId: msg.STATE_ID,
        countryId: msg.COUNTRY_ID,
        zipCode: msg.ZIP_CODE,
        telephone: msg.TELEPHONE,
        fax: msg.FAX,
        latitude: msg.LATITUDE,
        longitude: msg.LONGITUDE,
        operationalStatus: msg.OPERATIONAL_STATUS,
        siteMgrEmployeeId: msg.SITE_MGR_EMPLOYEE_ID,
        siteMgrSubType: msg.SITE_MGR_SUB_TYPE
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
