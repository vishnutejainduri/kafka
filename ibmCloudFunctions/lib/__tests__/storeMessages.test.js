const storeMessages = require('../storeMessages');

describe('storeMessages', function() {
    it('Successfully inserts the document', async function() {
        const params = {
            mongoUri: 'uri',
            mongoCertificateBase64: 'certificate',
            // collectionName should match the name in /product-consumers/__mocks__/mongodb.js
            collectionName: 'storeMessages',
            dbName: 'db-name'
        };
        const document = {
            activationId: 'activation-id',
            messages: [ { id: 'some-id', data: {} } ]
        };
        expect(await storeMessages(params, document)).toEqual(document);
    });
});
