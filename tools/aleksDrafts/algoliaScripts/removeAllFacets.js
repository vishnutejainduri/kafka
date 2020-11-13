const fs = require('fs');
const algoliasearch = require('algoliasearch');

//const client = algoliasearch('CDROBE4GID', 'a407c5096db78a36d719ed92b48d04da');
//const index = client.initIndex('styles_stage');

//const client = algoliasearch('CDROBE4GID', 'a407c5096db78a36d719ed92b48d04da');
//const index = client.initIndex('styles_production');

const client = algoliasearch('CDROBE4GID', 'a407c5096db78a36d719ed92b48d04da');
const index = client.initIndex('styles_development');

const fileName = 'dev/allfacets_202011131622_single.csv'
/*QUERY TO GENERATE ABOVE FILE FROM JESTA
SELECT STYLEID FROM (SELECT STYLE_COLOURS.IMAGE_STYLEID AS STYLEID, m.BRAND_ID, facets.CATEGORY, facets.DESC_ENG, facets.DESC_FR, facets.UPD_FLG, facets.FKORGANIZATIONNO, facets.CHAR_TY_SUB_TYPE, facets.CHARACTERISTIC_TYPE_ID, facets.LAST_MODIFIED AS LAST_MODIFIED, facets.CHARACTERISTIC_VALUE_ID
FROM ELCAT.STYLE_ITEM_CHARACTERISTICS_ECA facets
INNER JOIN ELCAT.STYLE_COLOURS ON SUBSTR(STYLE_COLOURS.STYLEID, 1, 8) = facets.STYLEID
INNER JOIN MERCH.STYLES m ON m.STYLE_ID = facets.STYLEID)
WHERE UPD_FLG = 'T' AND DESC_ENG IS NOT NULL  AND LAST_MODIFIED IS NOT NULL AND BRAND_ID = 1*/

fs.readFile(`./files/${fileName}`, 'utf-8', async (err, data) => {
  if (err) throw err;
  let dataRows = data.split('\n');
  dataRows = dataRows.filter((row) => row && row !== '')
  console.log('starting', dataRows.length);

  const operations = [];
  const stylesToUpdate = [];
  for (let i = 0; i < dataRows.length; i+=1000) {
    const incrementalRows = dataRows.slice(i,i+1000);
    operations.push(index.getObjects(incrementalRows, ['objectID']));
  }
  await Promise.all(operations).then((results) => {
    results.forEach((result) => {
      const recordsFound = result.results.filter((r) => r);
      recordsFound.forEach(record => {
        stylesToUpdate.push({
          ...record,
          pattern: null,
          collar: null,
          style: null,
          fabric: null,
          length: null,
          fit: null,
          cuff: null    
        })
      })
    });
  });
  console.log('stylesToUpdate', stylesToUpdate)
  await index.partialUpdateObjects(stylesToUpdate, false, (error, content) => {
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
