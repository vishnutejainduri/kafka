const consumeSkuMessage = require('../');
const { parseSkuMessage } = require('../../../lib/parseSkuMessage')

jest.mock('mongodb');

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
          FKORGANIZATIONNO: '1',
          SIZE_EN: 'English size',
          SIZE_FR: 'French size'
        }
    }],
    mongoUri: 'mongo-uri',
    dbName: 'db-name',
    mongoCertificateBase64: 'mong-certificate',
    collectionName: 'skus'
};

describe('consumeSkuMessage', () => {
    it('missing all parameters; should fail', async () => {
        expect((await consumeSkuMessage({})).error).toBeTruthy();
    });
    it('correct message to update sku', async () => {
        const response = await consumeSkuMessage(params);
        expect(response).toEqual({ shouldSkipResolvingOffsets: 1 });
    });
});

describe('parseSkuMessage', () => {
    it('returns a correctly formatted SKU object when given a valid Kafka message', () => {
        const expected = {
            _id: 'skuId',
            colorId: 'colorId',
            dimension: 'dimension',
            id: 'skuId',
            lastModifiedDate: 1000000000,
            size: {
                en: 'English size',
                fr: 'French size',
            },
            sizeId: 'sizeId',
            styleId: 'styleId',
        }
        expect(parseSkuMessage(params.messages[0])).toEqual(expected)
    })
});
