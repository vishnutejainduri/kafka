const consumeSalePrice = require('../');

describe("consumeSalePrice", function() {
    it("successfuly runs if all the parameters are provided and the messages are valid", async function() {
        const params = {
            topicName: 'some-name',
            mongoUri: 'MongoUri',
            mongoCertificateBase64: 'mongoCertificateBase64',
            dbName: 'dbName',
            collectionName: 'collectionName',
            messages: [{
                value: {
                    PRICE_CHANGE_ID: 'PRICE_CHANGE_ID',
                    STYLE_ID: 'STYLE_ID',
                }
            }]
        };
        expect(await consumeSalePrice(params)).toBe(undefined);
    });
});
