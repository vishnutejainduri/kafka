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

async function getValuesCollection({
    messagesMongoUri,
    mongoCertificateBase64,
    dbName
}) {
    return getCollection(
        {
            mongoUri: messagesMongoUri,
            mongoCertificateBase64,
            collectionName: 'valuesByActivationIds',
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

async function findUnresolvedBatches(params, limit = 100) {
    const collection = await getMessagesCollection(params);
    const result = await collection
        .find({ resolved: false }, { projection: { activationId: 1 } })
        .limit(limit)
        .toArray();
    return result;
}

async function findTimedoutBatchesActivationIds(params, limit = 100) {
    const collection = await getMessagesCollection(params);
    const result = await collection
        .find(
            { "activationInfo.annotations.3.value": true },
            { projection: { activationId: 1 } }
        )
        .limit(limit)
        .toArray();
    return result.map(({ activationId }) => activationId);
}

async function getFindMessagesValuesAndTopic(params) {
    const collection = await getMessagesCollection(params);
    return async function (activationId) {
        const { messages } = await collection.findOne({ activationId }, { projection: { messages: 1 } });
        return {
            topic: messages[0].topic,
            values: messages.map(({ value }) => value)
        } 
    };
}

async function getStoreValues(params) {
    const valuesCollection = await getValuesCollection(params);
    return async function(values) {
        return valuesCollection.insertMany(values);
    }
}

async function getDeleteBatch(params) {
    const collection = await getMessagesCollection(params);
    return async function(activationId) {
        const result = await collection.deleteOne({ activationId });
        return result;
    }
}

module.exports = {
    getMessagesCollection,
    storeBatch,
    findUnresolvedBatches,
    findTimedoutBatchesActivationIds,
    getFindMessagesValuesAndTopic,
    getDeleteBatch,
    getStoreValues
};
