const composer = require('openwhisk-composer');

const { COMPOSER_RETRIES } = require('../../product-consumers/constants');

module.exports = composer.retry(COMPOSER_RETRIES, 'commercetools/consume-sku-message-ct');
