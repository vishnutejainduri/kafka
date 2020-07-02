const { parseMediaMessage } = require('../../lib/parseMediaMessage');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { addErrorHandling, addLoggingToMain, passDownAnyMessageErrors } = require('../utils');

const main = async function (params) {
    console.log(JSON.stringify({
        cfName: 'consumeMediasMessage',
        params
    }));

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    let medias;
    try {
        medias = await getCollection(params);
    } catch(originalError) {
        throw createError.failedDbConnection(originalError);
    }

    return Promise.all(params.messages
        .map(addErrorHandling(msg => msg.topic === params.topicName ? msg : new Error('Topic mismatch')))
        .map(addErrorHandling(parseMediaMessage))
        .map(addErrorHandling(async (mediaData) => {
            await medias.deleteMany({ containerId: mediaData.containerId, qualifier: mediaData.qualifier });
            return medias.updateOne({ _id: mediaData._id }, { $currentDate: { lastModifiedInternal: { $type:"timestamp" } }, $set: mediaData }, { upsert: true })
              .then(() => console.log('Updated/inserted media ' + mediaData._id))
              .catch((err) => {
                  console.error('Problem with media ' + mediaData._id);
                  console.error(err);
                  if (!(err instanceof Error)) {
                      const e = new Error();
                      e.originalError = err;
                      e.attemptedDocument = mediaData;
                      return e;
                  }

                  err.attemptedDocument = mediaData;
                  return err;
              })
        }))
    )
    .then(passDownAnyMessageErrors);
}

global.main = addLoggingToMain(main);
module.exports = global.main;
