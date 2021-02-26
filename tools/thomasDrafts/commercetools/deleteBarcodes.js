const {
  getBarcodeObjectsFromBarcodeNumbers,
  removeBarcodeReferenceFromItsSkuAndDeleteBarcode
} = require('./commercetools')
const { getArrayFromCsv } = require('./utils')

const deleteBarcodes = async barcodeNumbers => {
  console.log(`Starting to delete [${barcodeNumbers.map(number => `'${number}'`).join(', ')}]`)
  let barcodeObjects = []
  try {
    barcodeObjects = await getBarcodeObjectsFromBarcodeNumbers(barcodeNumbers)
  } catch (error) {
    console.log(`Unable to fetch barcodes: ${error.message}`)
  }

  for (const barcode of barcodeObjects) {
    try {
      await removeBarcodeReferenceFromItsSkuAndDeleteBarcode(barcode)
    } catch (error) {
      console.error(`Unable to remove barcode ${barcode}: ${error.message}`)
    }
  }
  console.log('Done')
}

const deleteBarcodesByCsv = filename => {
  const barcodeNumbers = getArrayFromCsv(filename)
  deleteBarcodes(barcodeNumbers)
}

deleteBarcodesByCsv('./barcodes.csv')

module.exports = {
  deleteBarcodes,
  deleteBarcodesByCsv
}
