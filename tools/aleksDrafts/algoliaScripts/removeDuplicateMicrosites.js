const fs = require('fs');
const algoliasearch = require('algoliasearch');

//const client = algoliasearch('CDROBE4GID', 'a407c5096db78a36d719ed92b48d04da');
//const index = client.initIndex('styles_stage');

//const client = algoliasearch('CDROBE4GID', 'a407c5096db78a36d719ed92b48d04da');
//const index = client.initIndex('styles_production');

const client = algoliasearch('CDROBE4GID', 'a407c5096db78a36d719ed92b48d04da');
const index = client.initIndex('styles_development');

const fileName = 'dev/micrositeStyles_202011131321_single.csv'
/*QUERY TO GENERATE ABOVE FILE FROM JESTA
SELECT STYLEID FROM (SELECT STYLE_COLOURS.IMAGE_STYLEID AS STYLEID, facets.CATEGORY, facets.DESC_ENG, facets.DESC_FR, facets.UPD_FLG, facets.FKORGANIZATIONNO, facets.CHAR_TY_SUB_TYPE, facets.CHARACTERISTIC_TYPE_ID, facets.CHARACTERISTIC_VALUE_ID, facets.LAST_MODIFIED AS LAST_MODIFIED 
FROM ELCAT.STYLE_ITEM_CHARACTERISTICS_ECA facets
INNER JOIN ELCAT.STYLE_COLOURS ON SUBSTR(STYLE_COLOURS.STYLEID, 1, 8) = facets.STYLEID AND STYLE_COLOURS.COLOUR_ID = facets.COLOUR_ID)
WHERE CHARACTERISTIC_TYPE_ID = 'DPM01' AND UPD_FLG = 'T' AND DESC_ENG IS NOT NULL AND LAST_MODIFIED IS NOT NULL*/

fs.readFile(`./files/${fileName}`, 'utf-8', async (err, data) => {
  if (err) throw err;
  let dataRows = data.split('\n');
  dataRows = dataRows.filter((row) => row && row !== '')
  console.log('starting', dataRows.length);

  const operations = [];
  const stylesToUpdate = [];
  for (let i = 0; i < dataRows.length; i+=1000) {
    const incrementalRows = dataRows.slice(i,i+1000);
    operations.push(index.getObjects(incrementalRows, ['objectID', 'microsite']));
  }
  await Promise.all(operations).then((results) => {
    results.forEach((result) => {
      const recordsFound = result.results.filter((r) => r);
      recordsFound.forEach(record => {
        stylesToUpdate.push({
          ...record,
          microsite: record.microsite.filter((ms, position) => record.microsite.findIndex(ms2 => (ms2.en === ms.en || ms2.fr === ms.fr)) === position)
        })
      })
    });
  });
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
