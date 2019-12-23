const { getMessagesCollection } = require('../messagesLogs');

describe('messagesLogs', function() {
    describe('getMessagesCollection', function() {
        const params = {
            mongoUri: 'uri',
            messagesMongoUri: 'messages-uri',
            mongoCertificateBase64: 'certificate',
            // collectionName is always set to "messagesByActivationIds"
            collectionName: 'some-collection',
            dbName: 'db-name'
        };
    
        it('Successfully gets the collections', async function() {
            const collection = await getMessagesCollection(params);
            expect(collection.testId).toEqual('messagesByActivationIds');
        });
    });
});
