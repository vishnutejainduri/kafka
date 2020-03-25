const { existingCtBarcodeIsNewer } = require('../utils');

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
      lastModifiedDate: '1970-01-01T00:00:00.050Z' // = new Date(50)
    }
  };

  const newJestaBarcode = {
    lastModifiedDate: new Date(100),
    barcode: '1101',
    subType: 'subType',
    skuId: '1',
    styleId: '1'
  };

  const oldJestaBarcode = {
    ...newJestaBarcode,
    lastModifiedDate: new Date(0)
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
