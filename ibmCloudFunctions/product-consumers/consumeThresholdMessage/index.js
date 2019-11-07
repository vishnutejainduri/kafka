const { parseThresholdMessage } = require('../../lib/parseThresholdMessage');
const getCollection = require('../../lib/getCollection');

global.main = async function (params) {
    console.log(JSON.stringify({
        cfName: 'consumeThresholdMessage',
        params
    }));

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }


    const skus = await getCollection(params);
    const styles = await getCollection(params.stylesCollectionName);
    return Promise.all(params.messages
        .map(parseThresholdMessage)
        .map(async (thresholdData) => { 
              const skuData = await skus.findOne({ _id: thresholdData.skuId });
              const styleData = await styles.findOne({ _id: skuData.styleId });
 

              skus.updateOne({ _id: thresholdData.skuId }, { $set: { threshold: thresholdData.threshold } })
              .catch((err) => {
                  console.error('Problem with SKU ' + thresholdData.skuId);
                  console.error(err);
                  if (!(err instanceof Error)) {
                      const e = new Error();
                      e.originalError = err;
                      e.attemptedDocument = thresholdData;
                      return e;
                  }

                  err.attemptedDocument = thresholdData;
                  return err;
              })
            }
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
