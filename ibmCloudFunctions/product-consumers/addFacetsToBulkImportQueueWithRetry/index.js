const composer = require('openwhisk-composer');

const { COMPOSER_RETRIES } = require('../constants');

module.exports = composer.seq(
    'product-consumers/schema-validation',
    composer.retry(COMPOSER_RETRIES, 'product-consumers/add-facets-to-bulk-import-queue')
);
