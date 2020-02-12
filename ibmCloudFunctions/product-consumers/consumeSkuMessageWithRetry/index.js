const composer = require('openwhisk-composer')
 
module.exports = composer.retry(1, 'product-consumers/consume-sku-message');
