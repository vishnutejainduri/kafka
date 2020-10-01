const fs = require('fs');

const wstreamOutput = fs.createWriteStream('barcodes_MONGO_PROD_sep17.csv');

fs.readFile('./barcodes_MONGO_PROD_sep17.json', 'utf-8', (err, data) => {
  if (err) throw err;
  let dataRows = data.split('\n');
  dataRows = dataRows.filter((row) => row && row !== '')
  console.log('starting', dataRows.length);
  dataRows.forEach(dataRow => {
    const jsonData = JSON.parse(dataRow);
    console.log(jsonData._id);
    wstreamOutput.write(`${jsonData._id}` + '\n')
  })
});
