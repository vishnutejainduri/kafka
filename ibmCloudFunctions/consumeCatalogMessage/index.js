const parseStyleMessage = require('../lib/parseStyleMessage');
const getCollection = require('../lib/getCollection');

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
        .map((msg) => parseStyleMessage(msg))
        .map((styleData) => styles.findOne({ _id: styleData._id })
            .then((existingDocument) => existingDocument
                ? styles.updateOne({ _id: styleData._id, effectiveDate: { $lt: styleData.effectiveDate } }, { $set: styleData })
                : styles.insertOne(styleData)
            ).then(() => console.log("Updated/inserted document " + styleData._id))
            .catch((err) => {
                err.attemptedDocument = styleData;
                throw err;
            })
        )
    ).then((results) => { results });
    // TODO error handling - this MUST report errors and which offsets must be retried
}

module.exports = global.main;
