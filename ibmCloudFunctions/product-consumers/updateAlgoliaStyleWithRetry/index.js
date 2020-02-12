const composer = require('openwhisk-composer');

const { COMPOSER_RETRIES } = require('../constants');

module.exports = composer.retry(COMPOSER_RETRIES, 'product-consumers/update-algolia-style');
