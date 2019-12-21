const getCollection = require('./getCollection');

async function storeMessages(
    { mongoUri, mongoCertificateBase64, collectionName, dbName },
    { messages, activationId }
) {
    const collection = await getCollection(
        {
            mongoUri,
            mongoCertificateBase64,
            collectionName,
            dbName,
            instance: getCollection.instances.MESSAGES
        },
        null
    );
    return collection.insertOne({
        activationId,
        messages
    });
}

module.exports = storeMessages;
