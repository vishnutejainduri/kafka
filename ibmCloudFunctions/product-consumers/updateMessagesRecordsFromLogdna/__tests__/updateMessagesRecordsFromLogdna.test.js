const updateMessagesRecordsFromLogdna = require('../index');

describe("updateMessagesRecordsFromLogdna", function() {
    it('successfully extracts activationId', async function() {
        const activationId = 'oishiohewoithgsfd';
        const timeout = 'false';
        const params = {
            messagesMongoUri: 'messages-mongo-uri',
            mongoCertificateBase64: 'mongo-certificate-64',
            collectionName: 'collection-name',
            dbName: 'db-name',
            payload: [
                `
                    irrelevant data
                    activationId: ${activationId}
                    timeout: ${timeout}
                `
            ]
        };

        expect(await updateMessagesRecordsFromLogdna(params)).toEqual({
            activationId,
            timeout
        });
    });
})