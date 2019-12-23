const getCollection = require('./getCollection');
const { log, createLog } = require('../product-consumers/utils');

// TODO create proper indexes on mongo
async function getMessagesCollection({
    messagesMongoUri,
    mongoCertificateBase64,
    dbName
}) {
    return getCollection(
        {
            mongoUri: messagesMongoUri,
            mongoCertificateBase64,
            collectionName: 'messagesByActivationIds',
            dbName,
            instance: getCollection.instances.MESSAGES
        },
        null
    );
}

async function storeBatch(params) {
    try {
        const collection = await getMessagesCollection(params);
        const result = await collection
            .insertOne({
                activationId: process.env.__OW_ACTIVATION_ID,
                messages: params.messages,
                resolved: false
            });
        return result;
    } catch (error) {
        log(createLog.messagesLog.failedToStoreBatch(error));
        return error;
    }
}

async function findUnresolvedBatches(params) {
    const collection = await getMessagesCollection(params);
    return collection
        .find({ resolved: false }, { projection: { activationId: 1 } })
        .toArray()
}

// will merge new metadata with the current metadate
async function getResolveBatch(params) {
    const collection = await getMessagesCollection(params);
    return async function(activationId, activationInfo) {
        return collection
            .updateOne({ activationId }, { $set: { resolved: true, activationInfo } });
    }
}

module.exports = {
    getMessagesCollection,
    storeBatch,
    findUnresolvedBatches,
    getResolveBatch
};
