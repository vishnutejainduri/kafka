const getCollection = require('../../lib/getCollection');

global.main = async function (params) {
    const activationId = params.payload[0].match(/activationId(.*)/gm)[0].match(/: (.*)/)[1];
    const timeout = params.payload[0].match(/timeout(.*)/gm)[0].match(/: (.*)/)[1];

    const { messagesMongoUri, mongoCertificateBase64, dbName } = params;
    const collection = await getCollection(
        {
            mongoUri: messagesMongoUri,
            mongoCertificateBase64,
            collectionName: 'messagesByActivationIds',
            dbName,
            instance: getCollection.instances.MESSAGES
        },
        null
    );

	await collection.updateOne(
        { activationId },
        { $set: { timeout } }    
    );

    return {
        activationId,
        timeout
    }
}

module.exports = global.main;
