const parseCatalogMessage = require('./lib/parseCatalogMessage');
const getDatabaseUpdateFunction = require('./lib/getDatabaseUpdateFunction');

async function main(params) {
    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    const updateStyles = await getDatabaseUpdateFunction(params);
    const promise = new Promise().resolve();
    params.messages
        .filter((msg) => msg.topic === params.topicName)
        .map((msg) => parseCatalogMessage(msg))
        .forEach((styleData) => {
            // perform updates serially to avoid opening too many connections
            promise.then(() => updateStyles({ id: styleData.id }, styleData));
            // TODO error handling - this MUST report errors and which offests must be retried
        });

    return promise;
}

exports.main = main;
