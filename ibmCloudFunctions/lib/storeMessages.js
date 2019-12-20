const getCollection = require('./getCollection');

async function storeMessages(params, { messages, activationId }) {
    const collection = await getCollection(
        {
            ...params,
            mongoUri: params.messagesMongoUri
        },
        null,
        getCollection.instances.MESSAGES
    );
    return collection.insert({
        activationId,
        messages
    });
}

module.exports = storeMessages;
