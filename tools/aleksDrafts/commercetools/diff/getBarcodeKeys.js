const fs = require('fs');
const wstreamOutput = fs.createWriteStream('barcodes_CT_PROD_sep11.csv');

fs.readFile('./barcodes_CT_PROD_sep11.json', 'utf-8', (err, data) => {
  const dataRows = data.split('\n');
  dataRows.forEach(dataRow => {
    if (dataRow && dataRow !== ',' && dataRow !== ']' && dataRow !== '[') {
      try {
        const barcodeData = JSON.parse(dataRow);
        console.log('barcode', barcodeData.key);
        wstreamOutput.write(barcodeData.key + '\n');
      } catch (error) {
        console.error(error);
      }
    }
  })
});
