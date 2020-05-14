const getCollection = require('./getCollection');
const createError = require('../lib/createError');

const MESSAGES_LOG_ERROR = 'MESSAGES LOG ERROR.';

const log = new Proxy({
    failedToStoreBatch (error) {
        console.error(`${MESSAGES_LOG_ERROR} Failed to store batch of messages: ${error}`);
    },
    failedToUpdateBatchWithFailureIndexes (error) {
        console.error(`${MESSAGES_LOG_ERROR} Failed to update batch of messages with failure indexes: ${error}`)
    }
}, {
    get (loggers, logger) {
        return process.env.NODE_ENV === "test"
            ? () => {}
            : loggers[logger]
    }
})

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


// Although ObjectId can be used to find the insertion date of a document,
// it is somewhat convoluted, so we save recordTime and index it instead.
// Reference: https://stackoverflow.com/a/8753670/12727551

// function objectIdWithTimestamp(timestamp) {
//     if (typeof(timestamp) == 'string') {
//         timestamp = new Date(timestamp);
//     }
//     const hexSeconds = Math.floor(timestamp/1000).toString(16);
//     const constructedObjectId = ObjectId(hexSeconds + "0000000000000000");
//     return constructedObjectId
// }
// db.getCollection('messagesByActivationIds').find({ _id: { $lt: objectIdWithTimestamp('2020/04/24') } })

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
                recordTime: (new Date()).getTime(),
                isIam: Boolean(params.cloudFunctionsIsIam)
            });
        return result;
    } catch (error) {
        log.failedToStoreBatch(error);
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
        log.failedToUpdateBatchWithFailureIndexes(error);
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

async function findUnresolvedBatches(params, limit = 500) {
    const collection = await getMessagesCollection(params);
    let result = [];
    // maximum runtime of a cloud function is 10 minutes,
    // so after 15 minutes activation info should definitely be available unless somethings wrong on IBM side
    const query = {
        recordTime: { $lt: (new Date()).getTime() - 15 * 60 * 1000 },
        // this check is needed because we are temporarily using the same messages database for both cloudfoundry and IAM namespaces
        isIam: Boolean(params.cloudFunctionsIsIam)
    };
    await collection
        // We are not fetching the messages here because we typically expect the batch to be successfully processed,
        // in which case we don't need the messages and just delete the batch record
        .find(query, { projection: { activationId: 1, failureIndexes: 1 } })
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
        const record = await collection.findOne({ activationId });
        // It is possible for the record not to exist because multiple resolveMessagesLogs can run in parallel
        // and two of them end up in a race condition trying to process the same activation ID
        return record ? record.messages : [];
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
        log.failedToStoreBatch(error);
        return error;
    }
}

async function deleteOldBatches(params, cutoff) {
    const [
        messagesCollection,
        retryCollection,
        dlqCollection
    ] = await Promise.all([
        getMessagesCollection(params),
        getRetryCollection(params),
        getDlqCollection(params)
    ]);
    const activationIsOld = { recordTime: { $lt: cutoff } }
    const batchIsOld = { "metadata.activationInfo.end": { $lt: cutoff } }

    const [deletedMessages, deletedRetries, deletedDlqs] = await Promise.all([
        messagesCollection.deleteMany(activationIsOld),
        retryCollection.deleteMany(batchIsOld),
        dlqCollection.deleteMany(batchIsOld)
    ]);

    return {
        deletedMessages,
        deletedRetries,
        deletedDlqs
    }
}

module.exports = {
    getMessagesCollection,
    storeBatch,
    updateBatchWithFailureIndexes,
    findUnresolvedBatches,
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
