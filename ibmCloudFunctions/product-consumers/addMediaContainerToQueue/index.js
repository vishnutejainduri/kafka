const { filterMediaContainerMessage, parseMediaContainerMessage } = require('../../lib/parseMediaContainerMessage');
const getCollection = require('../../lib/getCollection');

global.main = async function (params) {
    console.log(JSON.stringify({
        cfName: 'addMediaContainerToQueue',
        params
    }));

    if (!params.topicName) {
        return { error: new Error('Requires an Event Streams topic.') };
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        return { error: new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field") };
    }

    const algoliaImageProcessingQueue = await getCollection(params);
    return Promise.all(params.messages
        .filter(filterMediaContainerMessage)
        .map(parseMediaContainerMessage)
        .map((mediaContainerDatas) => Promise.all(mediaContainerDatas
            .filter((mediaContainerData) => mediaContainerData.isMain)
            .map((mediaContainerData) => algoliaImageProcessingQueue.updateOne({ _id: mediaContainerData._id }, { $set: mediaContainerData }, { upsert: true })
                .then(() => console.log('Updated/inserted media container ' + mediaContainerData._id))
                .catch((err) => {
                    console.error('Problem with media container ' + mediaContainerData._id);
                    console.error(err);
                    if (!(err instanceof Error)) {
                        const e = new Error();
                        e.originalError = err;
                        e.attemptedDocument = mediaContainerData;
                        return e;
                    }

                    err.attemptedDocument = mediaContainerData;
                    return err;
                })
            )
        ))
    ).then((results) => {
        const errors = results.filter((res) => res instanceof Error);
        if (errors.length > 0) {
            const e = new Error(`${errors.length} of ${results.length} updates failed. See 'failedUpdatesErrors'.`);
            e.failedUpdatesErrors = errors;
            e.successfulUpdatesResults = results.filter((res) => !(res instanceof Error));
            return { error: e };
        }
    });
}

module.exports = global.main;
