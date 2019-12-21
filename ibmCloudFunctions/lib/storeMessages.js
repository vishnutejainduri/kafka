const getCollection = require('./getCollection');

async function storeMessages(
    { mongoUri, mongoCertificateBase64, collectionName, dbName },
    messagesRecord
) {
    const collection = await getCollection(
        {
            mongoUri,
            mongoCertificateBase64,
            collectionName: 'messagesByActivationIds',
            dbName,
            instance: getCollection.instances.MESSAGES
        },
        null
    );
    return collection.insertOne({ ...messagesRecord, collectionName });
}

module.exports = storeMessages;
