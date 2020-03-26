const consumeBarcodeMessageCT = require('..');
const { existingCtBarcodeIsNewer, getBarcodeUpdateAction } = require('../utils');

jest.mock('@commercetools/sdk-client');
jest.mock('@commercetools/api-request-builder');
jest.mock('@commercetools/sdk-middleware-auth');
jest.mock('@commercetools/sdk-middleware-http');
jest.mock('node-fetch');

describe('existingCtBarcodeIsNewer', () => {
  const ctBarcode = {
    id: 'foo',
    version: 1,
    container: 'barcodes',
    key: '1101',
    value: {
      styleId: '1',
      skuId: '1',
      subType: 'subType',
      barcode: '1101',
      lastModifiedDate: '1970-01-01T00:00:00.050Z' // equivalent to new Date(50)
    }
  };

  const newJestaBarcode = {
    lastModifiedDate: 100, // date in Unix time
    barcode: '1101',
    subType: 'subType',
    skuId: '1',
    styleId: '1'
  };

  const oldJestaBarcode = {
    ...newJestaBarcode,
    lastModifiedDate: 1
  };

  it('returns `true` if the given CT barcode is newer', () => {
    expect(existingCtBarcodeIsNewer(ctBarcode, oldJestaBarcode)).toBe(true);
  });

  it('returns `false` if the given CT barcode is older', () => {
    expect(existingCtBarcodeIsNewer(ctBarcode, newJestaBarcode)).toBe(false);
  });

  it('throws an informative error if the given barcode lacks a last modified date', () => {
    const jestaBarcodeWithoutDate = {...newJestaBarcode, lastModifiedDate: undefined };
    const expectedErrorMessage = 'Given barcode lacks last modified date (barcode number: 1101)';
    expect(() => existingCtBarcodeIsNewer(ctBarcode, jestaBarcodeWithoutDate)).toThrow(expectedErrorMessage);
  });

  it('throws an informative error if the existing CT barcode lacks a last modified date', () => {
    const ctBarcodeWithoutDate = { ...ctBarcode, value: {} };
    const expectedErrorMessage = 'CT barcode lacks last modified date (object reference: foo)'
    expect(() => existingCtBarcodeIsNewer(ctBarcodeWithoutDate, newJestaBarcode)).toThrow(expectedErrorMessage);
  });
});

describe('getBarcodeUpdateAction', () => {
  const jestaBarcode = {
    lastModifiedDate: 100,
    barcode: '1101',
    subType: 'subType',
    skuId: '1',
    styleId: '1',
    ctBarcodeReference: 'bar'
  };

  it('returns the correct CT update action object', () => {
    const barcodes = [{ id: 'foo', typeId: 'key-value-document' }];

    const ctSku = {
      id: '1',
      sku: '1',
      attributes: [{ name: 'barcodes', value: barcodes }]
    };

    const expectedAction = {
      action: 'setAttribute',
      name: 'barcodes',
      sku: '1',
      value: [
        { id: 'foo', typeId: 'key-value-document' },
        { id: 'bar', typeId: 'key-value-document' }
      ]
    };
    expect(getBarcodeUpdateAction(jestaBarcode, ctSku)).toEqual(expectedAction);
  });

  it('works when there are no pre-existing CT barcodes', () => {
    const ctSkuWithNoBarcodes = {
      id: '1',
      sku: '1',
      attributes: []
    };

    const expectedAction = {
      action: 'setAttribute',
      name: 'barcodes',
      sku: '1',
      value: [
        { id: 'bar', typeId: 'key-value-document' }
      ]
    };

    expect(getBarcodeUpdateAction(jestaBarcode, ctSkuWithNoBarcodes)).toEqual(expectedAction);
  });

  it('does not duplicate barcodes if you try to add a pre-existing barcode', () => {
    const barcodes = [{ id: 'bar', typeId: 'key-value-document' }]; // same ID as `jestaBarcode` above

    const ctSkuWithPreExistingBarcode = {
      id: '1',
      sku: '1',
      attributes: [{ name: 'barcodes', value: barcodes }]
    };

    const expectedAction = {
      action: 'setAttribute',
      name: 'barcodes',
      sku: '1',
      value: [
        { id: 'bar', typeId: 'key-value-document' }
      ]
    };

    expect(getBarcodeUpdateAction(jestaBarcode, ctSkuWithPreExistingBarcode)).toEqual(expectedAction);
  });
});

describe('consumeCatalogueMessageCT', () => {
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
