const composer = require('openwhisk-composer')
 
module.exports = composer.retry(3, 'add-facets-to-bulk-import-queue');
