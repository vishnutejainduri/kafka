const composer = require('openwhisk-composer');

const { COMPOSER_RETRIES } = require('../../product-consumers/constants');

module.exports = composer.retry(COMPOSER_RETRIES, 'commercetools/consume-styles-basic-message-ct');
