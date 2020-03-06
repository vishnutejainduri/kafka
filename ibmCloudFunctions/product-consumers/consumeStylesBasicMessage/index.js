const { parseStyleBasicMessage, filterStyleBasicMessage } = require('../../lib/parseStyleBasicMessage');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const messagesLogs = require('../../lib/messagesLogs');

const handleError = function (err, msg) {
  console.error('Problem with document ' + msg._id);
  console.error(err);
  if (!(err instanceof Error)) {
      const e = new Error();
      e.originalError = err;
      e.attemptedDocument = msg;
      return e;
  }

  err.attemptedDocument = msg;
  return err;
};

const main = async function (params) {
    console.log(JSON.stringify({
      cfName: 'consumeStylesBasicMessage',
      params
    }));

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    let styles;
    let algoliaDeleteCreateQueue;
    try {
      styles = await getCollection(params);
      algoliaDeleteCreateQueue = await getCollection(params, params.algoliaDeleteCreateQueue);
    } catch (originalError) {
      throw createError.failedDbConnection(originalError); 
    }

    return Promise.all(params.messages
        .filter(filterStyleBasicMessage)
        .map(parseStyleBasicMessage)
        .map(async (styleData) => {
            const operations = [];
            const existingDoc = await styles.findOne({ _id: styleData._id });

            if (existingDoc) {
              operations.push(styles.updateOne({ _id: styleData._id }, { $currentDate: { lastModifiedInternalOutlet: { $type:"timestamp" } }, $set: { isOutlet: styleData.isOutlet } }, { upsert: true })
                .catch((err) => {
                  return handleError(err, styleData)
                })
              );
            }

            if ((existingDoc && !existingDoc.isOutlet && styleData.isOutlet) || (!existingDoc && styleData.isOutlet)) {
              operations.push(algoliaDeleteCreateQueue.insertOne({ styleId: styleData._id, delete: true, create: false, insertionTime: styleData.lastModifiedDate})
                .catch((err) => {
                  return handleError(err, styleData)
                })
              );
            } else if (existingDoc && existingDoc.isOutlet && !styleData.isOutlet) {
              operations.push(algoliaDeleteCreateQueue.insertOne({ styleId: styleData._id, delete: false, create: true, insertionTime: styleData.lastModifiedDate})
                .catch((err) => {
                  return handleError(err, styleData)
                })
              );
            }
            return Promise.all(operations);
        })
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

global.main = async function (params) {
  return await Promise.all([
      main(params),
      messagesLogs.storeBatch(params)
  ])[0];
}

module.exports = global.main;
