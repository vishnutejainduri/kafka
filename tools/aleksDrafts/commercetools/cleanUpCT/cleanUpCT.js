const { getCtHelpers } = require('./client.js');
const { 
  deleteAllPrices,
  resetOnSaleFlags,
  fixEndDates
} = require('./cleanupService.js');

const userInput = process.argv.slice(2);
const environment = userInput[0];
const dataType = userInput[1];

if (environment !== 'dev' && environment !== 'development' && environment !== 'staging' && environment !== 'production') {
  console.log ('Invalid environment provided');
  return;
}

const ctHelpers = getCtHelpers (environment);

switch (dataType) {
  case 'fixenddates':
    fixEndDates(ctHelpers)
      .then(result => console.log('Total price rows fixed: ', result))
      .catch(e => console.log(e));
    break;
  case 'resetonsale':
    resetOnSaleFlags(ctHelpers)
      .then(result => console.log('Total flags reset: ', result))
      .catch(e => console.log(e));
    break;
  case 'prices':
    deleteAllPrices(ctHelpers)
      .then(result => console.log('Total prices deleted: ', result))
      .catch(e => console.log(e));
    break;
  default:
    console.log ('Invalid data type provided');
};

