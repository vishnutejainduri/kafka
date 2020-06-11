const { parseStyleBasicMessage } = require('../../lib/parseStyleBasicMessage');
const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { addErrorHandling, log, createLog, addLoggingToMain, passDownProcessedMessages } = require('../utils');

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
    log(createLog.params('consumeStylesBasicMessage', params));

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
        .map(addErrorHandling(parseStyleBasicMessage))
        .map(addErrorHandling(async (styleData) => {
          const existingDoc = await styles.findOne({ _id: styleData._id });

          // checking for change to reduce Algolia operations
          if (!existingDoc || existingDoc.isOutlet !== styleData.isOutlet) {
            await algoliaDeleteCreateQueue.insertOne({ styleId: styleData._id, delete: styleData.isOutlet, create: !styleData.isOutlet, insertionTime: styleData.lastModifiedDate})
              .catch((err) => {
                throw handleError(err, styleData)
              });
          } else {
            log(`Style data needs no update: ${styleData}`);
          }

          await styles.updateOne({ _id: styleData._id }, { $currentDate: { lastModifiedInternalOutlet: { $type:"timestamp" } }, $set: { brandId: styleData.brandId, isOutlet: styleData.isOutlet, lastModifiedExternalOutlet: styleData.lastModifiedDate } }, { upsert: true })
            .catch((err) => {
                throw handleError(err, styleData)
            });
        }))
    )
      .then(passDownProcessedMessages(params.messages))
      .catch(error => ({
          error
      }));
}

global.main = addLoggingToMain(main);

module.exports = global.main;
