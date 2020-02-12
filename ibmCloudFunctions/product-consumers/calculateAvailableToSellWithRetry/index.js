const composer = require('openwhisk-composer');

const { COMPOSER_RETRIES } = require('../constants');

module.exports = composer.retry(COMPOSER_RETRIES, 'product-consumers/calculate-available-to-sell');
