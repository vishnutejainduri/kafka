const fs = require('fs');
const algoliasearch = require('algoliasearch');
const client = algoliasearch('CDROBE4GID', 'a9feafb1e0c6967c51f2455cab940ed0');
const index = client.initIndex('styles_production');

//const wstreamError = fs.createWriteStream('errors.csv');
//const wstreamSuccess = fs.createWriteStream('success.csv');
const wstreamOutput = fs.createWriteStream('output.csv');

fs.readFile('./collarnotch_202008211513.csv', 'utf-8', (err, data) => {
  if (err) throw err;
  let dataRows = data.split('\n');
  dataRows = dataRows.filter((row) => row && row !== '')
  console.log('searching for', dataRows.length, 'records');
  const operations = [];
  for (let i = 0; i < dataRows.length; i+=1000) {
    const incrementalRows = dataRows.slice(i,i+1000);
    operations.push(index.getObjects(incrementalRows, ['objectID', 'collar']));
    //console.log('add to promise', i);
  }
  //console.log('operations.length', operations.length)
  Promise.all(operations).then((results) => {
    let existingCount = 0;
    results.forEach((result) => {
      const recordsFound = result.results.filter((r) => r);
      recordsFound.forEach(record => {
        wstreamOutput.write(record.objectID + ',' + JSON.stringify(record.collar) + '\n')
      })
      existingCount+=recordsFound.length;
    });
    console.log('existing count', existingCount);
  });
});
