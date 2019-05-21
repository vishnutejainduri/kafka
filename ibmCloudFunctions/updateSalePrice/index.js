/***
 * Listens for messages from Event Streams about the original price of a style.
 */
const getCollection = require('../lib/getCollection');

const ONLINE_SITE_ID = '00990';
const IN_STORE_SITE_ID = '00011';

global.main = async function (params) {
    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    const styles = await getCollection(params);
    return Promise.all(params.messages
        .filter((msg) => msg.topic === params.topicName)
        .map((msg) => {
                const updateToProcess = {
                    _id: msg.value.STYLE_ID,
                    id: msg.value.STYLE_ID
                };
                switch (msg.value.SITE_ID) {
                    case ONLINE_SITE_ID:
                        updateToProcess.onlineSalePrice = msg.value.NEW_RETAIL_PRICE;
                        break;
                    case IN_STORE_SITE_ID:
                    default:
                        updateToProcess.inStoreSalePrice = msg.value.NEW_RETAIL_PRICE;
                        break;
                }
                styles.updateOne(
                    { _id: msg.value.STYLE_ID },
                    { $set: updateToProcess },
                    { upsert: true }
                ).catch((err) => {
                    console.error('Problem with sale price price ' + msg.value.STYLE_ID, updateToProcess);
                    if (!(err instanceof Error)) {
                        const e = new Error();
                        e.originalError = err;
                        e.attemptedUpdate = msg.value;
                        return e;
                    }
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
};

module.exports = global.main;
