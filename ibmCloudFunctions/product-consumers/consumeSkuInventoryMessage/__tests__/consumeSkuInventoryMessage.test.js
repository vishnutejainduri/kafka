const consumeSkuInventoryMessage = require('../');
const { parseSkuInventoryMessage, filterSkuInventoryMessage } = require('../../../lib/parseSkuInventoryMessage');

jest.mock("mongodb");

const params = {
    topicName: 'inventory-connect-jdbc-SKUINVENTORY',
    messages: [{
        topic: 'inventory-connect-jdbc-SKUINVENTORY',
        value: {
          STYLE_ID:'styleId',
          SKU_ID:'skuId',
          STORE_ID:'storeId',
          CHECKIND: 't',
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

describe('consumeSkuInventoryMessage', () => {
    it('missing all parameters; should fail', async () => {
        await expect((await consumeSkuInventoryMessage({})).error).toBeTruthy()
    });
    it('correct message to update inventory', async () => {
        const response = await consumeSkuInventoryMessage(params);
        // returns nothing/undefined if successfully run
        expect(response).toEqual({
          messages: params.messages,
          shouldResolveOffsets: 1,
          ok: true,
          messagesCount: 1,
          batchSuccessCount: 1
        });
    });
    it('correct message to update inventory; batch two messages', async () => {
        const batchParams = { ...params, messages: [params.messages[0], params.messages[0]] }
        const response = await consumeSkuInventoryMessage(batchParams);
        // returns nothing/undefined if successfully run
        expect(response).toEqual({
          messages: batchParams.messages,
          shouldResolveOffsets: 1,
          ok: true,
          messagesCount: 2,
          batchSuccessCount: 1
        });
    });
    it('correct message to update inventory; dont batch two different messages', async () => {
        const batchParams = { ...params, messages: [{ ...params.messages[0], value: { ...params.messages[0].value, SKU_ID: 'skuId2' } }, params.messages[0]] }
        const response = await consumeSkuInventoryMessage(batchParams);
        // returns nothing/undefined if successfully run
        expect(response).toEqual({
          messages: batchParams.messages,
          shouldResolveOffsets: 1,
          ok: true,
          messagesCount: 2,
          batchSuccessCount: 2
        });
    });
});

describe('filterSkuInventoryMessage', () => {
    it('should only work for messages about the relevant topic', () => {
        const wrongTopicMessage = { topic: 'foobar' };
        expect(filterSkuInventoryMessage.bind(null, wrongTopicMessage)).toThrow('Can only parse SKUINVENTORY update messages');
    });

    it('should only work for messages in org 1', () => {
        const wrongOrgMessage = { ...params.messages[0], value: { ...params.messages[0].value, INV_FKORGANIZATIONNO: 2 } }
        const actual = filterSkuInventoryMessage(wrongOrgMessage);
        expect(actual).toEqual(false);
    });
});

describe('parseSkuInventoryMessage', () => {
    it('should only work for messages about the relevant topic', () => {
        const wrongTopicMessage = { topic: 'foobar' };
        expect(parseSkuInventoryMessage.bind(null, wrongTopicMessage)).toThrow('Can only parse SKU Inventory update messages');
    });

    it('should transform translatable fields that are populated', () => {
       const actual = parseSkuInventoryMessage(params.messages[0]);
       expect(actual).toEqual({
          _id: 'styleId-skuId-storeId',
          availableToSell: 1,
          checkInd: true,
          id: 'styleId-skuId-storeId',
          lastModifiedDate: 1000000000,
          quantityBackOrder: 0,
          quantityInPicking: 0,
          quantityInTransit: 0,
          quantityOnHand: 0,
          quantityOnHandNotSellable: 0,
          quantityOnHandSellable: 1,
          quantityOnOrder: 0,
          skuId: 'skuId',
          storeId: 'storeId',
          styleId: 'styleId'
       });
    });

    it('should subtract QIP from QOHS', () => {
       const testMessage = { ...params.messages[0], value: { ...params.messages[0].value, QIP: 1 } }
       const actual = parseSkuInventoryMessage(testMessage);
       expect(actual).toEqual({
          _id: 'styleId-skuId-storeId',
          availableToSell: 0,
          checkInd: true,
          id: 'styleId-skuId-storeId',
          lastModifiedDate: 1000000000,
          quantityBackOrder: 0,
          quantityInPicking: 1,
          quantityInTransit: 0,
          quantityOnHand: 0,
          quantityOnHandNotSellable: 0,
          quantityOnHandSellable: 1,
          quantityOnOrder: 0,
          skuId: 'skuId',
          storeId: 'storeId',
          styleId: 'styleId'
       });
    });

    it('if checkind is false availableToSell should always be false', () => {
       const testMessage = { ...params.messages[0], value: { ...params.messages[0].value, CHECKIND: 'f' } }
       const actual = parseSkuInventoryMessage(testMessage);
       expect(actual).toEqual({
          _id: 'styleId-skuId-storeId',
          availableToSell: 0,
          checkInd: false,
          id: 'styleId-skuId-storeId',
          lastModifiedDate: 1000000000,
          quantityBackOrder: 0,
          quantityInPicking: 0,
          quantityInTransit: 0,
          quantityOnHand: 0,
          quantityOnHandNotSellable: 0,
          quantityOnHandSellable: 1,
          quantityOnOrder: 0,
          skuId: 'skuId',
          storeId: 'storeId',
          styleId: 'styleId'
       });
    });
});
