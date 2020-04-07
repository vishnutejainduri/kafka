const consumeBarcodeMessageCT = require('..');

describe('consumeBarcodeMessageCT', () => {
  const validParams = {
    topicName: 'barcodes-connect-jdbc',
    messages: [{
        topic: 'barcodes-connect-jdbc',
        value: {
          'LASTMODIFIEDDATE': 1000000000000,
          'BARCODE': 'barcode',
          'SUBTYPE': 'subType',
          'SKU_ID': '1',
          'STYLEID': 'styleId',
          'FKORGANIZATIONNO': '1'
        }
    }],
    mongoUri: 'mongo-uri',
    dbName: 'db-name',
    mongoCertificateBase64: 'mong-certificate',
    collectionName: 'barcodes',
    ctpProjectKey: 'key',
    ctpClientId: 'id',
    ctpClientSecret: 'secret',
    ctpAuthUrl: 'url',
    ctpApiUrl: 'url',
    ctpScopes: 'manage_products:harryrosen-dev'
  };

  it('throws an error if the given parameters are invalid', () => {
    const invalidParams = {};
    return expect(consumeBarcodeMessageCT(invalidParams)).rejects.toThrow();
  });

  it('returns `undefined` if given valid params', async () => {
    const response = await consumeBarcodeMessageCT(validParams);
    expect(response).toBeUndefined();
  });
});
