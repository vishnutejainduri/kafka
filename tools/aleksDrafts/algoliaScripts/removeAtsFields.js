const fs = require('fs');
const algoliasearch = require('algoliasearch');

//const client = algoliasearch('CDROBE4GID', '361ed243272c3322f7543cb9d9e3f8ea');
//const index = client.initIndex('styles_stage');

//const client = algoliasearch('CDROBE4GID', 'eaa14f2cd23a2fd68bee6bea6ee931f3');
//const index = client.initIndex('test_sync_styles');

//const client = algoliasearch('CDROBE4GID', 'a407c5096db78a36d719ed92b48d04da');
//const index = client.initIndex('styles_development');

const client = algoliasearch('CDROBE4GID', '8c9b23189354bfaf4b444be064c6e174');
const index = client.initIndex('temp_styles');

//const wstreamError = fs.createWriteStream('errors.csv');
//const wstreamSuccess = fs.createWriteStream('success.csv');

fs.readFile('./files/dev/style_ids_remove_ats_PROD.csv', 'utf-8', (err, data) => {
  if (err) throw err;
  let dataRows = data.split('\n');
  dataRows = dataRows.filter((row) => row && row !== '')
  console.log('starting', dataRows.length);
  dataRows = dataRows.map((row) => {
    return {
      objectID: row,
      sizes: [],
      isAvailableToSell: false,
      isOnlineAvailableToSell: false,
      storeInventory: {},
      stores: []
    }
  });
  console.log('dataRows', dataRows);
  index.partialUpdateObjects(dataRows, false, (error, content) => {
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
