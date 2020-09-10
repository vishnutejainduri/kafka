const consumeBarcodeMessage = require('../');

jest.mock("mongodb");

describe('consumeBarcodeMessage', () => {
    it('missing all parameters; should fail', async () => {
        await expect((await consumeBarcodeMessage({})).error).toBeTruthy();
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
        expect(response).toEqual({ shouldResolveOffsets: 1 });
    });
});
