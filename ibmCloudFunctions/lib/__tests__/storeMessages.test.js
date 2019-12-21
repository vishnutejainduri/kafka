const storeMessages = require('../storeMessages');

describe('storeMessages', function() {
    it('Successfully inserts the document', async function() {
        const params = {
            mongoUri: 'uri',
            mongoCertificateBase64: 'certificate',
            // collectionName is always set to "messagesByActivationIds"
            collectionName: 'some-collection',
            dbName: 'db-name'
        };
        const document = {
            activationId: 'activation-id',
            messages: [ { id: 'some-id', data: {} } ]
        };
        expect(await storeMessages(params, document)).toEqual({
            ...document,
            collectionName: params.collectionName
        });
    });
});
