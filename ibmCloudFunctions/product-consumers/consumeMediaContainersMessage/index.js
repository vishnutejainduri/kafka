const { filterMediaContainerMessage, parseMediaContainerMessage } = require('../../lib/parseMediaContainerMessage');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { addLoggingToMain } = require('../utils');

const main = async function (params) {
    console.log(JSON.stringify({
        cfName: 'consumeMediaContainersMessage',
        params
    }));

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    let mediaContainers;
    try {
        mediaContainers = await getCollection(params);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    } 

    return Promise.all(params.messages
        .map(msg => filterMediaContainerMessage(msg) ? msg : null)
        .map(parseMediaContainerMessage)
        .map((mediaContainerDatas) => Promise.all(mediaContainerDatas
            // TODO handle updated main image containers by unsetting existing ones
            .map((mediaContainerData) => mediaContainers.updateOne({ _id: mediaContainerData._id }, { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set: mediaContainerData }, { upsert: true })
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
            throw e;
        }
    });
}

global.main = addLoggingToMain(main);

module.exports = global.main;
