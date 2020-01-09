const consumeSkuMessage = require('../');

jest.mock("mongodb");

describe('consumeSkuMessage', () => {
    it('missing all parameters; should fail', async () => {
        await expect(consumeSkuMessage({})).rejects.toThrow();
    });
    it('correct message to update sku', async () => {
        const params = {
            topicName: 'skus-connect-jdbc',
            messages: [{
                topic: 'skus-connect-jdbc',
                value: {
                  ID:'skuId',
                  STYLEID:'styleId',
                  COLORID:'colorId',
                  SIZEID: 'sizeId',
                  SIZE: 'size',
                  DIMENSION: 'dimension',
                  LASTMODIFIEDDATE:1000000000,
                  FKORGANIZATIONNO: '1'
                }
            }],
            mongoUri: 'mongo-uri',
            dbName: 'db-name',
            mongoCertificateBase64: 'mong-certificate',
            collectionName: 'skus'
        };
        const response = await consumeSkuMessage(params);
        // returns nothing/undefined if successfully run
        expect(response).toEqual(undefined);
    });
});
