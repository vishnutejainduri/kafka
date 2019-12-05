const getCollection = require('../../lib/getCollection');
const { addErrorHandling, log, createLog } = require('../utils');
const createError = require('../../lib/createError');

const parseStoreFulfillMessage = function (msg) {
    return {
        _id: msg.value.SITE_ID,
        id: msg.value.SITE_ID,
        canOnlineFulfill: msg.value.FULFILL_STATUS === 'Y' ? true : false
    };
};

global.main = async function (params) {
    log(createLog.params('consumeStoresFulfillMessage', params));
    // messages is not used, but paramsExcludingMessages is used
    // eslint-disable-next-line no-unused-vars
    const { messages, ...paramsExcludingMessages } = params;

    if (!params.topicName) {
        throw { error: new Error('Requires an Event Streams topic.') };
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw { error: new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field") };
    }

    let stores;
    try {
        stores = await getCollection(params);
    } catch (originalError) {
        throw { error: createError.failedDbConnection(originalError) }; 
    }

    return Promise.all(params.messages
        .filter(addErrorHandling((msg) => msg.topic === params.topicName))
        .map(addErrorHandling(parseStoreFulfillMessage))
        .map(addErrorHandling((storeData) => stores.updateOne({ _id: storeData._id }, { $set: storeData })
            .then(() => console.log('Updated store fulfill ' + storeData._id))
            .catch(originalError => {
                return createError.consumeStoresFulfillMessage.failedToUpdateStore(originalError, storeData._id);
            })
        ))
    )
    .then((results) => {
        const errors = results.filter((res) => res instanceof Error);
        if (errors.length > 0) {
            const e = new Error(`${errors.length} of ${results.length} updates failed. See 'failedUpdatesErrors'.`);
            e.failedUpdatesErrors = errors;
            e.successfulUpdatesResults = results.filter((res) => !(res instanceof Error));
            throw { error: e };
        }
    })
    .catch(originalError => {
        throw { error: createError.consumeStoresFulfillMessage.failed(originalError, paramsExcludingMessages) };
    });
}

module.exports = global.main;
