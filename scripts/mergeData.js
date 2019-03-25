/*
This script is used to generate a data export for Algolia without using the event bus. It fakes price and availability
data.

query to export data, save as json with a tool like DataGrip:
select * from (select
  CATALOG.STYLEID as objectId,
  CATALOG.STYLEID as id,
  BRAND_NAME_ENG as brandName,
  DESC_ENG as name,
  CATALOG.MARKET_DESC_ENG as marketingDescription,
  CATALOG.DETAIL_DESC3_ENG as construction,
  CATALOG.FABRICANDMATERIAL_EN as fabricAndMaterials,
  CATALOG.SIZE_DESC_ENG as styleAndMeasurements,
  CATALOG.CAREINSTRUCTIONS_EN as careInstructions,
  CATALOG.ADVICE_EN as advice,
  CATAGORY as level1Category,
  CATAGORY_LEVEL_1A as level2Category,
  CATAGORY_LEVEL_2A as level3Category,
  WEBSTATUS as webStatus,
  SEASON_CD as season,
  STYLE_COLOURS.COLOUR_DESC_ENG as colour,
  STYLE_COLOURS.COLOURGROUP_EN as colourGroup,
  APPROVED_FOR_WEB as approvedDate
from ELCAT.CATALOG
LEFT JOIN ELCAT.STYLE_COLOURS on CATALOG.STYLEID = STYLE_COLOURS.STYLEID
  where STYLE_COLOURS.COLOUR_DESC_ENG IS NOT null AND DESC_ENG is not null)
 where ROWNUM <= 40000 ;

map attribute names to camel case:
cat ~/styles40k.json | sed 's/"ID"/"id"/g' | sed 's/"BRANDNAME"/"brandName"/g' | sed 's/"NAME"/"name"/g' | sed 's/"MARKETINGDESCRIPTION"/"marketingDescription"/g' | sed 's/"CONSTRUCTION"/"construction"/g' | sed 's/"FABRICANDMATERIALS"/"fabricAndMaterials"/g' | sed 's/"STYLEANDMEASUREMENTS"/"styleAndMeasurements"/g' | sed 's/"CAREINSTRUCTIONS"/"careInstructions"/g' | sed 's/"ADVICE"/"advice"/g' | sed 's/"IMAGES"/"images"/g' | sed 's/"LEVEL1CATEGORY"/"level1Category"/g' | sed 's/"LEVEL2CATEGORY"/"level2Category"/g' | sed 's/"LEVEL3CATEGORY"/"level3Category"/g' | sed 's/"WEBSTATUS"/"webStatus"/g' | sed 's/"SEASON":/"season":/g' | sed 's/"COLORID"/"colorId"/g' | sed 's/"COLOUR":/"colour":/g' | sed 's/"APPROVEDDATE"/"approvedDate"/g' | sed 's/"OBJECTID"/"objectId"/g' | sed 's/"COLOURGROUP"/"colourGroup"/g' > styles40k.json
 */

const jsonfile = require('jsonfile');
const availability = ['available', 'limited', 'not_available', 'coming_soon'];
const translated = ["brandName", "name", "marketingDescription", "construction", "fabricAndMaterials", "styleAndMeasurements", "careInstructions", "advice", "level1Category", "level2Category", "level3Category", "colour", "colourGroup"];
jsonfile.readFile('styles40k.json')
    .then(data => {
        return newData = data.map(elem => {
            elem.objectId = elem.objectId.trim().replace('-00', '');
            // randomly generate other data which is hard to get manually
            elem.price = (Math.random() * 2000).toFixed(2);
            elem.availability = availability[Math.floor(Math.random() * 4)];
            translated.forEach(attributeName => {
                elem[attributeName] = { "en": elem[attributeName], "fr": null };
            });
            return elem;
        })
    })
    .then(newData => {
        return jsonfile.writeFile('styles40k-mapped.json', newData);
    })
    .then(() => {
        console.log('Done')
    })