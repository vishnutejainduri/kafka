const { getCtHelpers } = require('./client.js');
const { 
  getProductPrice,
  getOrders,
  getCrm
} = require('./runCTQuery.js');

const userInput = process.argv.slice(2);
const environment = userInput[0];
const dataType = userInput[1];

if (environment !== 'dev' && environment !== 'development' && environment !== 'staging' && environment !== 'production' && environment !== 'prod') {
  console.log ('Invalid environment provided');
  return;
}

const ctHelpers = getCtHelpers (environment);

switch (dataType) {
  case 'productprice':
    getProductPrice(ctHelpers)
      .then(result => console.log('Total products: ', result))
      .catch(e => console.log(e));
    break;
  case 'orders':
    getOrders(ctHelpers)
      .then(result => console.log('Total orders: ', result))
      .catch(e => console.log(e));
    break;
  case 'crm':
    getCrm(ctHelpers)
      .then(result => console.log('Total crm: ', result))
      .catch(e => console.log(e));
    break;
  default:
    console.log ('Invalid data type provided');
};

