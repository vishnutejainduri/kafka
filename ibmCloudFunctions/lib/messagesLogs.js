const getCollection = require('./getCollection');
const { log, createLog } = require('../product-consumers/utils');

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
        await collection
            .insertOne({
                activationId: process.env.__OW_ACTIVATION_ID,
                messages: params.messages
            });
        return true;
    } catch (error) {
        log(createLog.messagesLog.failedToStoreBatch(error));
        return error;
    }
}

module.exports = {
    getMessagesCollection,
    storeBatch  
};
