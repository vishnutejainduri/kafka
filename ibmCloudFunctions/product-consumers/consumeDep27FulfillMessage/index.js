const getCollection = require('../../lib/getCollection');

const parseDep27FulfillMessage = function (msg) {
    return {
        _id: msg.value.SITE_ID,
        id: msg.value.SITE_ID,
        canFulfillDep27: msg.value.FULFILL_STATUS === 'Y' ? true : false
    };
};

global.main = async function (params) {
    console.log(JSON.stringify({
        cfName: 'consumeDep27FulfillMessage',
        params
    }));

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    const stores = await getCollection(params);
    return Promise.all(params.messages
        .filter((msg) => msg.topic === params.topicName)
        .map(parseDep27FulfillMessage)
        .map((storeData) => stores.updateOne({ _id: storeData._id }, { $set: storeData })
            .then(() => console.log('Updated store dep27 status ' + storeData._id))
            .catch((err) => {
                console.error('Problem with store dep27 status ' + storeData._id);
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
