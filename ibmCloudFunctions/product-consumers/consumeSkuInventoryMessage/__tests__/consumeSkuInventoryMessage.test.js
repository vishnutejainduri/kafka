const consumeSkuInventoryMessage = require('../');

jest.mock("mongodb");

describe('consumeSkuInventoryMessage', () => {
    it('missing all parameters; should fail', async () => {
        await expect(consumeSkuInventoryMessage({})).rejects.toThrow();
    });
    it('correct message to update inventory', async () => {
        const params = {
            topicName: 'inventory-connect-jdbc-SKUINVENTORY',
            messages: [{
                topic: 'inventory-connect-jdbc-SKUINVENTORY',
                value: {
                  STYLE_ID:'styleId',
                  SKU_ID:'skuId',
                  STORE_ID:'storeId',
                  QBO:0,
                  QIT:0,
                  QIP:0,
                  QOH:0,
                  QOHNOTSELLABLE:0,
                  QOHSELLABLE:1,
                  QOO:0,
                  LASTMODIFIEDDATE:1000000000,
                  INV_FKORGANIZATIONNO: '1'
                }
            }],
            mongoUri: 'mongo-uri',
            dbName: 'db-name',
            mongoCertificateBase64: 'mong-certificate',
            collectionName: 'inventory' 
        };
        const response = await consumeSkuInventoryMessage(params);
        // returns nothing/undefined if successfully run
        expect(response).toBeInstanceOf(Object);
    });
});
