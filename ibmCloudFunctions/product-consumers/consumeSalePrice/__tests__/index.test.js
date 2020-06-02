const consumeSalePrice = require('../');
const { priceActivityTypes } = require('../../../constants');

describe("consumeSalePrice", function() {
    it("successfuly runs if all the parameters are provided and the messages are valid", async function() {
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
                ACTIVITY_TYPE: priceActivityTypes.APPROVED,
                PROCESS_DATE_CREATED: 1000000000000,
                NEW_RETAIL_PRICE: 'newRetailPrice',
                SITE_ID: '00990'
              }
          }]
        };
      expect(await consumeSalePrice(validParams)).toEqual({ errors: [], failureIndexes: [], successCount: 1 });
    });
    it("invalid params -> failure", async function() {
      return expect(consumeSalePrice({})).rejects.toThrow();
    });
});
