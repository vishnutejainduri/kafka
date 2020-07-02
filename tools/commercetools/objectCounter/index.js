const { getCtHelpers } = require('./client.js');
const { getAllVariantsCount, getAllImagesCount } = require('./productService.js');

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
      .then(result => console.log('Total variants FINAL: ', result))
      .catch(e => console.log(e));
    break;
  case 'images':
    getAllImagesCount(ctHelpers)
      .then(result => console.log('Total images FINAL: ', result))
      .catch(e => console.log(e));
    break;
  default:
    console.log ('Invalid data type provided');
};

