const fs = require('fs');

const wstreamOutput = fs.createWriteStream('algolia_styles_PROD.json');

fs.readFile('./styles_ids_PROD.json', 'utf-8', (err, data) => {
  if (err) throw err;
  let dataRows = data.split('\n');
  dataRows = dataRows.filter((row) => row && row !== '')
  console.log('starting', dataRows.length);
  dataRows.forEach(dataRow => {
    //const styleId = dataRow.split(',')[1]
    const styleData = JSON.parse(dataRow);
    console.log(styleData);
    wstreamOutput.write(`{ "_id":"${styleData._id}", "styleId":"${styleData._id}" }` + '\n')
  })
});
