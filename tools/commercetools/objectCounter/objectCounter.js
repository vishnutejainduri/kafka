const { getCtHelpers } = require('./client.js');
const { 
  getAllVariantsCount,
  getAllImagesCount,
  getAllBarcodesCount,
  getAllPricesCount,
  getAllOutletFlagsCount,
  getAllCount
} = require('./productService.js');

const userInput = process.argv.slice(2);
const environment = userInput[0];
const dataType = userInput[1];

if (environment !== 'dev' && environment !== 'development' && environment !== 'staging' && environment !== 'production') {
  console.log ('Invalid environment provided');
  return;
}

const ctHelpers = getCtHelpers (environment);

switch (dataType) {
  case 'variants':
    getAllVariantsCount(ctHelpers)
      .then(result => console.log('Total variants FINAL: ', result.variantTotal))
      .catch(e => console.log(e));
    break;
  case 'images':
    getAllImagesCount(ctHelpers)
      .then(result => console.log('Total images FINAL: ', result.imageTotal))
      .catch(e => console.log(e));
    break;
  case 'barcodes':
    getAllBarcodesCount(ctHelpers)
      .then(result => console.log('Total barcodes FINAL: ', result.barcodeTotal))
      .catch(e => console.log(e));
    break;
  case 'prices':
    getAllPricesCount(ctHelpers)
      .then(result => console.log('Total prices FINAL: ', result.pricesTotal))
      .catch(e => console.log(e));
    break;
  case 'outlet':
    getAllOutletFlagsCount(ctHelpers)
      .then(result => console.log('Total outlet flags FINAL: ', result.outletFlagsTotal))
      .catch(e => console.log(e));
    break;
  case 'all':
    getAllCount(ctHelpers)
      .then(result => console.log('Total FINAL: ', result))
      .catch(e => console.log(e));
    break;
  default:
    console.log ('Invalid data type provided');
};

