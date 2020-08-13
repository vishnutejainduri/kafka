const { getCtHelpers } = require('./client.js');
const { 
  getAllMissing,
  getAllMissingSkus,
  getAllMissingBarcodes,
  getAllMissingStylesBasic,
  getAllProductsMissingAllData
} = require('./productService.js');

const userInput = process.argv.slice(2);
const environment = userInput[0];
const dataType = userInput[1];
const quickTest = userInput[2];

const ENV_DEV = 'dev'
const ENV_STAGE = 'stage'
const ENV_PROD = 'prod'

let QUICK_TEST
if (quickTest === 'test') QUICK_TEST = true

if (environment !== 'dev' && environment !== 'development'
   && environment !== 'staging' && environment !== 'stage'
   && environment !== 'production' && environment !== 'prod') {
  console.log ('Invalid environment provided');
  return;
}

let ENV
if (environment === 'dev' || environment === 'development') ENV = ENV_DEV
if (environment === 'stage' || environment === 'staging') ENV = ENV_STAGE
if (environment === 'prod' || environment === 'production') ENV = ENV_PROD

const ctHelpers = getCtHelpers (ENV);

switch (dataType) {
  case 'missingall':
    getAllProductsMissingAllData(ctHelpers, ENV, QUICK_TEST)
      .then(result => console.log('Total FINAL:', result))
      .catch(e => console.log(e));
    break;
  case 'variants':
    getAllMissingSkus(ctHelpers, ENV, QUICK_TEST)
      .then(result => console.log('Total FINAL:', result))
      .catch(e => console.log(e));
    break;
  case 'barcodes':
    getAllMissingBarcodes(ctHelpers, ENV, QUICK_TEST)
      .then(result => console.log('Total FINAL:', result))
      .catch(e => console.log(e));
    break;
  case 'stylesbasic':
    getAllMissingStylesBasic(ctHelpers, ENV, QUICK_TEST)
      .then(result => console.log('Total FINAL:', result))
      .catch(e => console.log(e));
    break;
  case 'all':
    getAllMissing(ctHelpers, ENV, QUICK_TEST)
      .then(result => console.log('Total FINAL:', result))
      .catch(e => console.log(e));
    break;
  default:
    console.log ('Invalid data type provided');
};
