const getCollection = require('./getCollection');
const { log, createLog } = require('../product-consumers/utils');
const createError = require('../lib/createError');

// TODO create proper indexes on mongo
async function getMessagesCollection({
    messagesMongoUri,
    messagesMongoCertificateBase64,
    dbName
}) {
    return getCollection(
        {
            mongoUri: messagesMongoUri,
            mongoCertificateBase64: messagesMongoCertificateBase64,
            collectionName: 'messagesByActivationIds',
            dbName,
            instance: getCollection.instances.MESSAGES
        },
        null
    );
}

async function getInvalidMessagesCollection({
    messagesMongoUri,
    messagesMongoCertificateBase64,
    dbName
}) {
    return getCollection(
        {
            mongoUri: messagesMongoUri,
            mongoCertificateBase64: messagesMongoCertificateBase64,
            collectionName: 'invalidMessagesByActivationIds',
            dbName,
            instance: getCollection.instances.MESSAGES
        },
        null
    );
}

async function getDlqCollection({
    messagesMongoUri,
    messagesMongoCertificateBase64,
    dbName
}) {
    return getCollection(
        {
            mongoUri: messagesMongoUri,
            mongoCertificateBase64: messagesMongoCertificateBase64,
            collectionName: 'dlqMessagesByActivationIds',
            dbName,
            instance: getCollection.instances.MESSAGES
        },
        null
    );
}

async function getRetryCollection({
    messagesMongoUri,
    messagesMongoCertificateBase64,
    dbName
}) {
    return getCollection(
        {
            mongoUri: messagesMongoUri,
            mongoCertificateBase64: messagesMongoCertificateBase64,
            collectionName: 'retryMessagesByActivationIds',
            dbName,
            instance: getCollection.instances.MESSAGES
        },
        null
    );
}

async function getValuesCollection({
    messagesMongoUri,
    messagesMongoCertificateBase64,
    dbName
}) {
    return getCollection(
        {
            mongoUri: messagesMongoUri,
            mongoCertificateBase64: messagesMongoCertificateBase64,
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
        const transactionId = process.env.__OW_TRANSACTION_ID;
        let messages = params.messages;
        if (params.messages === null) {
            // for messages in a sequence, only the first step has the messages as stored in Kafka topics
            // for the subsequent steps we copy the messages e.g. see calculateAvailableToSell/index.js
            messages = (await collection.findOne({ transactionId }, { projection: { messages: 1 }})).messages;
        }
        const result = await collection
            .insertOne({
                activationId: process.env.__OW_ACTIVATION_ID,
                transactionId,
                messages,
                resolved: false,
                recordTime: (new Date()).getTime()
            });
        return result;
    } catch (error) {
        log(createLog.messagesLog.failedToStoreBatch(error));
        return error;
    }
}

async function updateBatchWithFailureIndexes(params, failureIndexes) {
    try {
        const collection = await getMessagesCollection(params);
        const transactionId = process.env.__OW_TRANSACTION_ID;
        const result = await collection
            .updateOne({
                activationId: process.env.__OW_ACTIVATION_ID,
                transactionId,
            }, {
              $set: {
                resolved: 'partial',
                failureIndexes
              }
            });
        return result;
    } catch (error) {
        log(createLog.messagesLog.failedToUpdateBatchWithFailureIndexes(error));
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

async function findBatches(params, limit = 50) {
    const collection = await getMessagesCollection(params);
    let result = [];
    await collection
        .find({}, { projection: { activationId: 1, failureIndexes: 1 } })
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

async function getRetryBatches(params, limit = 50) {
    const collection = await getRetryCollection(params);
    const result = [];
    await collection
        .find({
            "messages": {
                $elemMatch: {
                    "value.metadata.nextRetry": {
                        $lte: new Date().getTime()
                    }
                }
            }
        })
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

async function storeInvalidMessages(params, invalidMessages) {
    try {
        const collection = await getInvalidMessagesCollection(params);
        const result = await collection
            .insertOne({
                activationId: process.env.__OW_ACTIVATION_ID,
                trasactionId: process.env.__OW_TRANSACTION_ID,
                invalidMessages
            });
        return result;
    } catch (error) {
        log(createLog.messagesLog.failedToStoreBatch(error));
        return error;
    }
}

async function deleteOldBatches(params) {
    const [
        messagesCollection,
        retryCollction,
        dlqCollection
    ] = await Promise.all([
        getMessagesCollection(params),
        getRetryCollection(params),
        getDlqCollection(params)
    ]);

    const threshold = (new Date()).getTime() - 1000 * 60 * 60 * 24 * (params.messagesLogsPersistenceDays || 28)
    const activationIsOld = { recordTime: { $lt: threshold } }
    const batchIsOld = { "metadata.activationInfo.end": { $lt: threshold } }

    return Promise.all([
        messagesCollection.deleteMany(activationIsOld),
        retryCollction.deleteMany(batchIsOld),
        dlqCollection.deleteMany(batchIsOld)
    ])
}

module.exports = {
    getMessagesCollection,
    storeBatch,
    updateBatchWithFailureIndexes,
    findBatches,
    findTimedoutBatchesActivationIds,
    getFindMessages,
    getDeleteBatch,
    getStoreValues,
    getStoreDlqMessages,
    getStoreRetryMessages,
    getRetryBatches,
    getUpdateRetryBatch,
    getDeleteRetryBatch,
    storeInvalidMessages,
    deleteOldBatches
};
