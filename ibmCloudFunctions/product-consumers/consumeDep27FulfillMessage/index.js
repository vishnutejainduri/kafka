const getCollection = require('../../lib/getCollection');
const { addErrorHandling, log, createLog } = require('../utils');
const createError = require('../../lib/createError');

const parseDep27FulfillMessage = function (msg) {
    return {
        _id: msg.value.SITE_ID,
        id: msg.value.SITE_ID,
        canFulfillDep27: msg.value.FULFILL_STATUS === 'Y' ? true : false
    };
};

global.main = async function (params) {
    log(createLog.params('consumeDep27FulfillMessage', params));
    // messages is not used, but paramsExcludingMessages is used
    // eslint-disable-next-line no-unused-vars
    const { messages, ...paramsExcludingMessages } = params;

    if (!params.topicName) {
        return { error: new Error('Requires an Event Streams topic.') };
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        return { error: new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field") };
    }

    const stores = await getCollection(params)
      .catch(originalError => {
          return { error: createError.failedDbConnection(originalError) };
      });
    return Promise.all(params.messages
        .filter(addErrorHandling((msg) => msg.topic === params.topicName))
        .map(addErrorHandling(parseDep27FulfillMessage))
        .map(addErrorHandling((storeData) => stores.updateOne({ _id: storeData._id }, { $set: storeData })
            .then(() => console.log('Updated store dep27 status ' + storeData._id))
            .catch(originalError => {
                return createError.consumeDep27FulfillMessage.failedUpdates(originalError, storeData._id);
            })
        )
    ))
    .then((results) => {
        const errors = results.filter((res) => res instanceof Error);
        if (errors.length > 0) {
            const e = new Error(`${errors.length} of ${results.length} updates failed. See 'failedUpdatesErrors'.`);
            e.failedUpdatesErrors = errors;
            e.successfulUpdatesResults = results.filter((res) => !(res instanceof Error));
            return { error: e };
        }
    })
    .catch(originalError => {
        return { error: createError.consumeDep27FulfillMessage.failed(originalError, paramsExcludingMessages) };
    });
}

module.exports = global.main;
