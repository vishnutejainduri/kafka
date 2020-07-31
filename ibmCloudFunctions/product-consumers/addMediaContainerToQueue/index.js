const { filterMediaContainerMessage, parseMediaContainerMessage } = require('../../lib/parseMediaContainerMessage');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { addErrorHandling, addLoggingToMain, passDownAnyMessageErrors } = require('../utils');

const main = async function (params) {
    console.log(JSON.stringify({
        cfName: 'addMediaContainerToQueue',
        params
    }));

    let algoliaImageProcessingQueue;
    try {
        algoliaImageProcessingQueue = await getCollection(params);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    return Promise.all(params.messages
        .map(addErrorHandling(msg => filterMediaContainerMessage(msg) ? msg : null))
        .map(addErrorHandling(parseMediaContainerMessage))
        .map(addErrorHandling((mediaContainerDatas) => Promise.all(mediaContainerDatas
            .filter((mediaContainerData) => mediaContainerData.isMain)
            .map((mediaContainerData) => algoliaImageProcessingQueue.updateOne({ _id: mediaContainerData._id }, { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set: mediaContainerData }, { upsert: true }))
        )))
    )
    .then(passDownAnyMessageErrors);
}

global.main = addLoggingToMain(main);
module.exports = global.main;
