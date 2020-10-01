const fs = require('fs');

const wstreamOutput = fs.createWriteStream('thresholds_sep14_202009141340.json');

fs.readFile('./thresholds_sep14_202009141340_NO_DUPES.csv', 'utf-8', (err, data) => {
  if (err) throw err;
  let dataRows = data.split('\n');
  dataRows = dataRows.filter((row) => row && row !== '')
  console.log('starting', dataRows.length);
  dataRows.forEach(dataRow => {
    const styleId = dataRow
    console.log(styleId);
    wstreamOutput.write(`{ "_id":"${styleId}", "styleId":"${styleId}" }` + '\n')
  })
});
