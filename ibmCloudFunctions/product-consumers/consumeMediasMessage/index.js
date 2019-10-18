const { parseMediaMessage } = require('../../lib/parseMediaMessage');
const getCollection = require('../../lib/getCollection');

global.main = async function (params) {
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

    const medias = await getCollection(params);
    return Promise.all(params.messages
        .filter((msg) => msg.topic === params.topicName)
        .map(parseMediaMessage)
        .map(async (mediaData) => {
            await medias.deleteMany({ containerId: mediaData.containerId, qualifier: mediaData.qualifier });
            return medias.updateOne({ _id: mediaData._id }, { $set: mediaData }, { upsert: true })
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
        })
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
