const consumeBarcodeMessage = require('../');

jest.mock("mongodb");

describe('consumeBarcodeMessage', () => {
    it('missing all parameters; should fail', async () => {
        await expect(consumeBarcodeMessage({})).rejects.toThrow();
    });
    it('correct message to update barcode', async () => {
        const params = {
            topicName: 'barcodes-connect-jdbc',
            messages: [{
                topic: 'barcodes-connect-jdbc',
                value: {
                  'LASTMODIFIEDDATE': 1000000000000,
                  'BARCODE': 'barcode',
                  'SUBTYPE': 'subType',
                  'SKU_ID': 'skuId',
                  'STYLEID': 'styleId',
                  'FKORGANIZATIONNO': '1'
                }
            }],
            mongoUri: 'mongo-uri',
            dbName: 'db-name',
            mongoCertificateBase64: 'mong-certificate',
            collectionName: 'barcodes'
        };
        const response = await consumeBarcodeMessage(params);
        // returns nothing/undefined if successfully run
        expect(response).toEqual(undefined);
    });
});
