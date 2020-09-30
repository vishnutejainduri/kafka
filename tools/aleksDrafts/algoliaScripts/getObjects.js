const fs = require('fs');
const algoliasearch = require('algoliasearch');
const client = algoliasearch('CDROBE4GID', '361ed243272c3322f7543cb9d9e3f8ea');
const index = client.initIndex('styles_stage');

//const wstreamError = fs.createWriteStream('errors.csv');
//const wstreamSuccess = fs.createWriteStream('success.csv');

fs.readFile('./files/10digit_styles_to_delete_DEV.csv', 'utf-8', (err, data) => {
  if (err) throw err;
  let dataRows = data.split('\n');
  dataRows = dataRows.filter((row) => row && row !== '')
  console.log('searching for', dataRows.length, 'records');
  const operations = [];
  for (let i = 0; i < dataRows.length; i+=1000) {
    const incrementalRows = dataRows.slice(i,i+1000);
    operations.push(index.getObjects(incrementalRows, ['objectID']));
    //console.log('add to promise', i);
  }
  //console.log('operations.length', operations.length)
  Promise.all(operations).then((results) => {
    let existingCount = 0;
    results.forEach((result) => {
      const recordsFound = result.results.filter((r) => r);
      existingCount+=recordsFound.length;
    });
    console.log('existing count', existingCount);
  });
});
