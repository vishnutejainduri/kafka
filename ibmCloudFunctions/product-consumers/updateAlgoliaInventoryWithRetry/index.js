const composer = require('openwhisk-composer')
 
module.exports = composer.retry(3, 'product-consumers/update-algolia-inventory');
