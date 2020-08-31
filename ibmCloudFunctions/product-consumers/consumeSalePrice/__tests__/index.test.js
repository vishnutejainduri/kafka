const consumeSalePrice = require('../');
const { priceChangeActivityTypes } = require('../../../constants');

const validParams = {
  topicName: 'sale-prices-connect-jdbc',
  mongoUri: 'mongo-uri',
  dbName: 'db-name',
  mongoCertificateBase64: 'mong-certificate',
  collectionName: 'prices',
  messages: [{
      topic: 'sale-prices-connect-jdbc',
      value: {
        STYLE_ID: 'styleId',
        PRICE_CHANGE_ID: 'priceChangeId',
        START_DATE: 1000000000000,
        END_DATE: 1000000000000,
        ACTIVITY_TYPE: priceChangeActivityTypes.APPROVED,
        PROCESS_DATE_CREATED: 1000000000000,
        NEW_RETAIL_PRICE: 'newRetailPrice',
        SITE_ID: '00990'
      }
  }]
};

describe("consumeSalePrice", function() {
    it("successfuly runs if all the parameters are provided and the messages are valid; 1 message 1 batch", async function() {
      expect(await consumeSalePrice(validParams)).toEqual({
        batchSuccessCount: 1,
        messagesCount: 1,
        ok: true ,
        shouldSkipResolvingOffsets: 1
      });
    });
    it("successfuly runs if all the parameters are provided and the messages are valid; 2 messages 1 batch", async function() {
      const validParamsBatch = { ...validParams, messages: [{ ...validParams.messages[0] }, { ...validParams.messages[0], value: { ...validParams.messages[0].value, PRICE_CHANGE_ID: 'priceChangeId2' } }] }
      expect(await consumeSalePrice(validParamsBatch)).toEqual({
        batchSuccessCount: 1,
        messagesCount: 2,
        ok: true,
        shouldSkipResolvingOffsets: 1
      });
    });
    it("successfuly runs if all the parameters are provided and the messages are valid; 2 messages 2 batches", async function() {
      const validParamsBatch = { ...validParams, messages: [{ ...validParams.messages[0] }, { ...validParams.messages[0], value: { ...validParams.messages[0].value, PRICE_CHANGE_ID: 'priceChangeId2', STYLE_ID: 'styleId2' } }] }
      expect(await consumeSalePrice(validParamsBatch)).toEqual({
        batchSuccessCount: 2,
        messagesCount: 2,
        ok: true,
        shouldSkipResolvingOffsets: 1
      });
    });
    it("invalid params -> failure", async function() {
      return expect((await consumeSalePrice({})).error).toBeTruthy();
    });
});
