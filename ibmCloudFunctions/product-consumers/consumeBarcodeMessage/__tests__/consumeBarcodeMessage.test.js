const { parseBarcodeMessage } = require('../../../lib/parseBarcodeMessage')
const consumeBarcodeMessage = require('../');

jest.mock("mongodb");

describe('consumeBarcodeMessage', () => {
    it('missing all parameters; should fail', async () => {
        await expect((await consumeBarcodeMessage({})).errorResult).toBeTruthy();
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


describe('parseBarcodeMessage', () => {
    const barcodeMessage = {
        topic: 'barcodes-connect-jdbc',
        value: 	{
            LASTMODIFIEDDATE: '2016-04-03T19:59:52.000Z',
            BARCODE: '01050996-01',
            SUBTYPE: 'UPCE',
            SKU_ID: '-775551',
            STYLEID: '01050996',
            FKORGANIZATIONNO: '1',
            EFFECTIVEDATETIME: '1970-01-01T05:00:00.000Z',
            EXPIRYDATETIME: '+010000-01-01T05:00:00.000Z'
        }
    }

    it('parses barcodes correctly', () => {
        expect(parseBarcodeMessage(barcodeMessage)).toEqual({
            _id: '01050996-01',
            barcode: '01050996-01',
            effectiveAt: new Date('1970-01-01T05:00:00.000Z'),
            expiresAt: new Date('+010000-01-01T05:00:00.000Z'),
            lastModifiedDate: '2016-04-03T19:59:52.000Z',
            skuId: '-775551',
            styleId: '01050996',
            subType: 'UPCE'
        })
    })

    it('defaults invalid dates to null', () => {
        expect(parseBarcodeMessage({ ...barcodeMessage, value: { ...barcodeMessage.value, EXPIRYDATETIME: 'invalid date' } })).toEqual({
            _id: '01050996-01',
            barcode: '01050996-01',
            effectiveAt: new Date('1970-01-01T05:00:00.000Z'),
            expiresAt: null,
            lastModifiedDate: '2016-04-03T19:59:52.000Z',
            skuId: '-775551',
            styleId: '01050996',
            subType: 'UPCE'
        })
    })
})
