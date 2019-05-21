/***
 * Listens for messages from Event Streams about the original price of a style.
 */
const getCollection = require('../lib/getCollection');
const { filterPriceMessages, parsePriceMessage } = require('../lib/parsePriceMessage');

const ONLINE_SITE_ID = '00990';
const IN_STORE_SITE_ID = '00011';

function generateUpdateFromParsedMessage(priceData) {
    const updateToProcess = {
        _id: priceData.styleId,
        id: priceData.styleId
    };
    switch (priceData.siteId) {
        case ONLINE_SITE_ID:
            updateToProcess.onlineSalePrice = priceData.newRetailPrice;
            break;
        case IN_STORE_SITE_ID:
        default:
            updateToProcess.inStoreSalePrice = priceData.newRetailPrice;
            break;
    }
    return updateToProcess;
}

global.main = async function (params) {
    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    const styles = await getCollection(params);
    return Promise.all(params.messages
        .filter(filterPriceMessages)
        .map(parsePriceMessage)
        .map(generateUpdateFromParsedMessage)
        .map((update) => {
                styles.updateOne(
                    { _id: update._id },
                    { $set: update },
                    { upsert: true }
                ).catch((err) => {
                    console.error('Problem with sale price price ' + update.styleId, update);
                    if (!(err instanceof Error)) {
                        const e = new Error();
                        e.originalError = err;
                        e.attemptedUpdate = update;
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
