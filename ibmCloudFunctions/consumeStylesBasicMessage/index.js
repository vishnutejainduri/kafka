const { parseStyleBasicMessage, filterStyleBasicMessage } = require('../lib/parseStyleBasicMessage');
const getCollection = require('../lib/getCollection');

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

global.main = async function (params) {
    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    const [styles, algoliaDeleteCreateQueue] = await Promise.all([
        getCollection(params),
        getCollection(params, params.algoliaDeleteCreateQueue)
    ]);
    return Promise.all(params.messages
        .filter(filterStyleBasicMessage)
        .map(parseStyleBasicMessage)
        .map(async (styleData) => {
            const operations = [];
            const existingDoc = await styles.findOne({ _id: styleData._id });

            if (existingDoc) {
              operations.push(styles.updateOne({ _id: styleData._id }, { $set: { isOutlet: styleData.isOutlet } }, { upsert: true })
                .catch((err) => {
                  return handleError(err, styleData)
                })
              );
            }

            if (existingDoc && !existingDoc.isOutlet && styleData.isOutlet) {
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
            const e = new Error('Some updates failed. See `results`.');
            e.results = results;
            throw e;
        }
    });
}

module.exports = global.main;
