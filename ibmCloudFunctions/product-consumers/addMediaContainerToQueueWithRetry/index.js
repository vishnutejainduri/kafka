const composer = require('openwhisk-composer')
 
module.exports = composer.retry(1, 'product-consumers/add-media-container-to-queue-message');
