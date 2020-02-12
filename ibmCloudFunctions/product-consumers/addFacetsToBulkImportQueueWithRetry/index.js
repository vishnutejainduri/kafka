const composer = require('openwhisk-composer')

module.exports = composer.seq(
    'product-consumers/schema-validation',
    composer.retry(1, 'product-consumers/add-facets-to-bulk-import-queue')
);
