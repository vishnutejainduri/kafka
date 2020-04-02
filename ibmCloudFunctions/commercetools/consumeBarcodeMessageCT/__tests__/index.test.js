const consumeBarcodeMessageCT = require('..');
const {
  existingCtBarcodeIsNewer,
  getBarcodeUpdateAction, // deprecated
  getSingleSkuBarcodeUpdateAction,
  getBarcodeBatchUpdateActions,
  removeDuplicateIds,
  groupBarcodesByStyleId,
  getOutOfDateBarcodeIds
} = require('../utils');

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

describe('removeDuplicateIds', () => {
  it('returns an empty array if given an empty array', () => {
    expect(removeDuplicateIds([]).length).toBe(0);
  });

  it('returns an array with the same elements if given an array with no duplicate ids', () => {
    const noDuplicateIds = [{ id: '1', typeId: 'key-value-document'}, {id: '2', typeId: 'key-value-document'}];
    expect(removeDuplicateIds(noDuplicateIds)).toEqual(noDuplicateIds);
  });

  it('returns an array with the duplicates removed if given an array with duplicate ids', () => {
    const duplicateIds = [{ id: '1', typeId: 'key-value-document'}, {id: '1', typeId: 'key-value-document'}];
    expect(removeDuplicateIds(duplicateIds)).toEqual([duplicateIds[0]]);
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

describe('groupBarcodesByStyleId', () => {
  const barcode1 = {
    lastModifiedDate: new Date(100),
    barcode: '1101',
    subType: 'subType',
    skuId: '1',
    styleId: '001',
  };

  const barcode2 = {
    lastModifiedDate: new Date(100),
    barcode: '1102',
    subType: 'subType',
    skuId: '2',
    styleId: '001',
  };

  const barcode3 = {
    lastModifiedDate: new Date(100),
    barcode: '1103',
    subType: 'subType',
    skuId: '3',
    styleId: '002',
  };

  const barcodes = [barcode1, barcode2, barcode3];

  it('correctly groups by style ID when given array of barcodes some of which share the same style ID', () => {
    expect(groupBarcodesByStyleId(barcodes)).toEqual([[barcode1, barcode2], [barcode3]]);
  });

  it('correctly groups by style ID when given array of barcodes all of which have different style IDs', () => {
    expect(groupBarcodesByStyleId([barcode1, barcode3])).toEqual([[barcode1], [barcode3]]);
  });

  it('returns an empty array when given an empty array', () => {
    expect(groupBarcodesByStyleId([])).toEqual([]);
  });
});

describe('getOutOfDateBarcodeIds', () => {
  const barcode1 = {
    lastModifiedDate: new Date(50),
    barcode: '1101',
    subType: 'subType',
    skuId: '1',
    styleId: '001',
  };

  const barcode2 = {
    lastModifiedDate: new Date(0),
    barcode: '1102',
    subType: 'subType',
    skuId: '2',
    styleId: '001',
  };

  const barcode3 = {
    lastModifiedDate: new Date(50),
    barcode: '1103',
    subType: 'subType',
    skuId: '3',
    styleId: '002',
  };

  const barcodes = [barcode1, barcode2, barcode3];

  const newerCtBarcode = {
    id: 'foo',
    version: 1,
    container: 'barcodes',
    key: '1102',
    value: {
      styleId: '1',
      skuId: '1',
      subType: 'subType',
      barcode: '1102',
      lastModifiedDate: '1970-01-01T00:00:00.050Z' // equivalent to new Date(50)
    }
  };

  const olderCtBarcode = {
    id: 'foo',
    version: 1,
    container: 'barcodes',
    key: '1101',
    value: {
      styleId: '1',
      skuId: '1',
      subType: 'subType',
      barcode: '1101',
      lastModifiedDate: '1970-01-01T00:00:00.000Z' // equivalent to new Date(0)
    }
  };

  it('returns an array of out of date barcode IDs', () => {
    expect(getOutOfDateBarcodeIds([newerCtBarcode], barcodes)).toEqual(['1102']);
    expect(getOutOfDateBarcodeIds([newerCtBarcode, olderCtBarcode], barcodes)).toEqual(['1102']);
  });

  it('returns an empty array when no given barcodes are out of date', () => {
    expect(getOutOfDateBarcodeIds([olderCtBarcode], barcodes)).toEqual([]);
    expect(getOutOfDateBarcodeIds([], barcodes)).toEqual([]);
  });

  it('returns an empty array when given an empty array of barcodes', () => {
    expect(getOutOfDateBarcodeIds([olderCtBarcode], [])).toEqual([]);
    expect(getOutOfDateBarcodeIds([], [])).toEqual([]);
  });
});

describe('getSingleSkuBarcodeUpdateAction', () => {
  const ctBarcode = {
    id: 'bar',
    key: '1101',
    value: {
      lastModifiedDate: 100,
      barcode: '1101',
      subType: 'subType',
      skuId: '1',
      styleId: '1',
      ctBarcodeReference: 'bar'
    }
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
    expect(getSingleSkuBarcodeUpdateAction([ctBarcode], ctSku)).toEqual(expectedAction);
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

    expect(getSingleSkuBarcodeUpdateAction([ctBarcode], ctSkuWithNoBarcodes)).toEqual(expectedAction);
  });

  it('does not duplicate barcodes if you try to add a pre-existing barcode', () => {
    const barcodes = [{ id: 'bar', typeId: 'key-value-document' }]; // same ID as `ctBarcode` above

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

    expect(getSingleSkuBarcodeUpdateAction([ctBarcode], ctSkuWithPreExistingBarcode)).toEqual(expectedAction);
  });
});

describe('getBarcodeBatchUpdateActions', () => {
  const getMockCtBarcode = (barcodeNumber, reference, skuId = '1', styleId = '1', lastModifiedDate = '1970-01-01T00:00:00.100Z') => ({
    id: reference,
    key: barcodeNumber,
    value: {
      lastModifiedDate: lastModifiedDate,
      barcode: barcodeNumber,
      subType: 'subType',
      skuId,
      styleId
    }
  });

  const barcode1 = getMockCtBarcode('0001', 'foo', '1');
  const barcode2 = getMockCtBarcode('0002', 'bar', '1');
  const barcode3 = getMockCtBarcode('0003', 'baz', '2');
  const barcode4 = getMockCtBarcode('0004', 'bat', '1');

  const ctSkuWithPreexistingBarcode = {
    id: '1',
    sku: '1',
    attributes: [{ name: 'barcodes', value: [{ id: 'foo', typeId: 'key-value-document' }] }]
  };

  const ctSkuWithNoBarocdes = {
    id: '2',
    sku: '2',
    attributes: []
  };

  const skus = [ctSkuWithPreexistingBarcode, ctSkuWithNoBarocdes];

  it('returns the correct array when different barcodes belong to different SKUs', () => {
    const barcodesToAddToSkus = [barcode1, barcode2, barcode3, barcode4];
    const expectedActions = [
      {
        action: 'setAttribute',
        name: 'barcodes',
        sku: '1',
        value: [
          { id: 'foo', typeId: 'key-value-document' },
          { id: 'bar', typeId: 'key-value-document' },
          { id: 'bat', typeId: 'key-value-document' }

        ]
      },
      {
        action: 'setAttribute',
        name: 'barcodes',
        sku: '2',
        value: [
          { id: 'baz', typeId: 'key-value-document' },
        ]
      }
    ];

    expect(getBarcodeBatchUpdateActions(barcodesToAddToSkus, skus)).toEqual(expectedActions);
  });

  it('returns the correct array when all barcodes belong to the same SKU', () => {
    const barcodesToAddToSkus = [barcode1, barcode4];
    const expectedActions = [
      {
        action: 'setAttribute',
        name: 'barcodes',
        sku: '1',
        value: [
          { id: 'foo', typeId: 'key-value-document' },
          { id: 'bat', typeId: 'key-value-document' }
        ]
      }
    ];

    expect(getBarcodeBatchUpdateActions(barcodesToAddToSkus, [ctSkuWithPreexistingBarcode])).toEqual(expectedActions);
  });
});
