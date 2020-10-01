const fs = require('fs');
const algoliasearch = require('algoliasearch');
//const client = algoliasearch('CDROBE4GID', '361ed243272c3322f7543cb9d9e3f8ea');
//const index = client.initIndex('styles_stage');

const client = algoliasearch('CDROBE4GID', 'eaa14f2cd23a2fd68bee6bea6ee931f3');
const index = client.initIndex('test_sync_styles');

//const wstreamError = fs.createWriteStream('errors.csv');
//const wstreamSuccess = fs.createWriteStream('success.csv');

fs.readFile('./files/prod/sizes_to_empty_PROD.csv', 'utf-8', (err, data) => {
  if (err) throw err;
  let dataRows = data.split('\n');
  dataRows = dataRows.filter((row) => row && row !== '')
  console.log('starting', dataRows.length);
  dataRows = dataRows.map((row) => {
    return {
      objectID: row,
      sizes: [],
      isSellable: false
    }
  });
  console.log('dataRows', dataRows);
  index.partialUpdateObjects(dataRows, (error, content) => {
    if (error) throw error;
    console.log('algolia task id', content.taskID);
    index.waitTask(content.taskID, errTask => {
      if (errTask) {
        throw errTask;
      }
      console.log('algolia done');
    });
  });
});
