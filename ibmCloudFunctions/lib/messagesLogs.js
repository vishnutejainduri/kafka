const getCollection = require('./getCollection');
const { log, createLog } = require('../product-consumers/utils');
const createError = require('../lib/createError');

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

async function getDlqCollection({
    messagesMongoUri,
    mongoCertificateBase64,
    dbName
}) {
    return getCollection(
        {
            mongoUri: messagesMongoUri,
            mongoCertificateBase64,
            collectionName: 'dlqMessagesByActivationIds',
            dbName,
            instance: getCollection.instances.MESSAGES
        },
        null
    );
}

async function getRetryCollection({
    messagesMongoUri,
    mongoCertificateBase64,
    dbName
}) {
    return getCollection(
        {
            mongoUri: messagesMongoUri,
            mongoCertificateBase64,
            collectionName: 'retryMessagesByActivationIds',
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

async function getStoreDlqMessages(params) {
    const collection = await getDlqCollection(params);
    return async function(messages, metadata ) {
        const result = await collection.insertOne({ messages, metadata });
        return result;
    }
}

async function getStoreRetryMessages(params) {
    const collection = await getRetryCollection(params);
    return async function(messages, metadata ) {
        const result = await collection.insertOne({ messages, metadata });
        return result;
    }
}

async function findUnresolvedBatches(params, limit = 100) {
    const collection = await getMessagesCollection(params);
    let result = [];
    await collection
        .find({ resolved: false }, { projection: { activationId: 1 } })
        .limit(limit)
        .forEach(document => {
            result.push(document);
        });

    return result;
}

async function findTimedoutBatchesActivationIds(params, limit = 100) {
    const collection = await getMessagesCollection(params);
    let result = [];
    await collection
        .find(
            { "activationInfo.annotations.3.value": true },
            { projection: { activationId: 1 } }
        )
        .limit(limit)
        .forEach(document => {
            result.push(document);
        });
    return result.map(({ activationId }) => activationId);
}

async function getFindMessages(params) {
    const collection = await getMessagesCollection(params);
    return async function (activationId) {
        const { messages } = await collection.findOne({ activationId }, { projection: { messages: 1 } });
        return messages;
    };
}

async function getRetryBatches(params, limit = 100) {
    const collection = await getRetryCollection(params);
    const result = [];
    await collection
        .find()
        .limit(limit)
        .forEach(document => {
            result.push(document);
        });
    return result;
}

async function getStoreValues(params) {
    const valuesCollection = await getValuesCollection(params);
    return async function(values) {
        try {
            const result = await valuesCollection.insertMany(values, { ordered: false, wtimeout: 600000 });
            return result;
        } catch (bulkWriteError) {
            throw createError.messagesLogs.storeValues.partialFailure(
                bulkWriteError,
                values.length,
                bulkWriteError.writeErrors.map(({ index }) => index)
            )
        }
    }
}

async function getDeleteBatch(params) {
    const collection = await getMessagesCollection(params);
    return async function(activationId) {
        const result = await collection.deleteOne({ activationId });        
        return result;
    }
}

async function getUpdateRetryBatch(params) {
    const collection = await getRetryCollection(params);
    return async function(activationId, updates) {
        const result = await collection.updateOne({ activationId }, { $set: updates });
        return result;
    }
}

async function getDeleteRetryBatch(params) {
    const collection = await getRetryCollection(params);
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
    getFindMessages,
    getDeleteBatch,
    getStoreValues,
    getStoreDlqMessages,
    getStoreRetryMessages,
    getRetryBatches,
    getUpdateRetryBatch,
    getDeleteRetryBatch
};
