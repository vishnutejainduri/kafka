const fs = require('fs');
const wstreamOutput = fs.createWriteStream('recovery_query_JESTA_PROD.sql');

let barcodeQuery = "SELECT sx.LASTMODIFIEDDATE, sx.PKPRODUCTNO as barcode, sx.SUBTYPE, s.PKSKU AS SKU_ID, sc.IMAGE_STYLEID as styleId, sx.FKORGANIZATIONNO FROM VSTORE.SKUXREF sx INNER JOIN (SELECT PKSKU, SKUCOLOR, FKSTYLENO FROM VSTORE.SKU) s ON sx.FKSKU = s.PKSKU INNER JOIN ELCAT.STYLE_COLOURS sc ON SUBSTR(sc.STYLEID,1,8) = s.fkstyleno AND sc.COLOUR_ID = s.skucolor AND styleId IS NOT NULL AND sx.FKORGANIZATIONNO = 1 WHERE "
let skuQuery = "SELECT s.LASTMODIFIEDDATE, s.FKORGANIZATIONNO, s.pksku as id, sc.IMAGE_STYLEID as styleId, s.skusize as \"SIZE\", s.fksizeno as sizeId, s.skudimension as dimension, s.skucolor as colorId, st.SIZE_EN, st.SIZE_FR FROM vstore.sku s INNER JOIN ELCAT.STYLE_COLOURS sc ON SUBSTR(sc.STYLEID,1,8) = s.fkstyleno AND sc.COLOUR_ID = s.skucolor INNER JOIN ELCAT.SIZE_TRANSLATION st ON st.SIZE_MERCH = s.SKUSIZE AND s.FKORGANIZATIONNO = 1 AND styleId IS NOT NULL WHERE "
let stylesBasicQuery = "SELECT sc.IMAGE_STYLEID AS STYLE_ID, BRAND_ID, LAST_MODIFIED_DATE FROM MERCH.STYLES INNER JOIN ELCAT.STYLE_COLOURS sc ON SUBSTR(sc.STYLEID,1,8) = STYLE_ID AND BRAND_ID IN ('1','2','3') WHERE "

let query = skuQuery
let whereKey = ''
if (query === barcodeQuery) whereKey = 'sx.PKPRODUCTNO'
if (query === skuQuery) whereKey = 's.pksku'
if (query === stylesBasicQuery) whereKey = 'sc.IMAGE_STYLEID'

fs.readFile('./skus_diff_MONGO_JESTA_PROD_sep17.csv', 'utf-8', (err, data) => {
  let dataRows = data.split('\n');
  console.log('key', dataRows[0]);
  query += ` ${whereKey} = '${dataRows[0]}'`
  dataRows = dataRows.slice(1); 
  dataRows.forEach(dataRow => {
    if (dataRow && dataRow !== ',') {
      try {
        console.log('row', dataRow);
        query += ` OR ${whereKey} = '${dataRow}'`
      } catch (error) {
        console.error(error);
      }
    }
  })
  wstreamOutput.write(query);
});
