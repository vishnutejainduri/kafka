# Style Queries and Transforms

## Style Query
> **IMPORTANT!** This query does not have the timestamp fields

```sql
select
  STYLEID as id,
  BRAND_NAME_ENG as brandName_EN,
  BRAND_NAME_FR as brandName_FR,
  DESC_ENG as name,
  DESC_FR as name_FR,
  MARKET_DESC_ENG as marketingDescription_EN,
  MARKET_DESC_FR as marketingDescription_FR,
  DETAIL_DESC3_ENG as construction_EN,
  DETAIL_DESC3_FR as construction_FR,
  FABRICANDMATERIAL_EN as fabricAndMaterials_EN,
  FABRICANDMATERIAL_FR as fabricAndMaterials_FR,
  SIZE_DESC_ENG as styleAndMeasurements_EN,
  SIZE_DESC_FR as styleAndMeasurements_FR,
  CAREINSTRUCTIONS_EN as careInstructions_EN,
  CAREINSTRUCTIONS_FR as careInstructions_FR,
  ADVICE_EN as advice_EN,
  ADVICE_FR as advice_FR,
  CATAGORY as level1Category_EN,
  CATAGORY as level1Category_FR,
  CATAGORY_LEVEL_1A as level2Category_EN,
  CATAGORY_LEVEL_1A as level2Category_FR,
  CATAGORY_LEVEL_2A as level3Category_EN,
  CATAGORY_LEVEL_2A as level3Category_FR,
  WEBSTATUS as webStatus_EN,
  WEBSTATUS as webStatus_FR,
  SEASON_CD as season,
  COLORID as colorId,
  VSN as vsn
from ELCAT.CATALOG
```

## Style Transforms

The relevant transformations to styles (aside from field renaming) are:
- Remove the trailling '-00' from the IDs
- Aggregate the translatable fields into a single key.

> The tool I used to export the query capitalized all the field names, that's why they're in all caps here

```js
return DB_STYLES.map(s => ({
  "id": s.ID.match(/\d+/)[0],
  "season": s.SEASON,
  "colorId": s.COLORID,
  "brandName": {
    "en": s.BRANDNAME_EN,
    "fr": s.BRANDNAME_FR
  },
  "name": {
    "en": s.NAME,
    "fr": s.NAME_FR
  },
  "marketingDescription": {
    "en": s.MARKETINGDESCRIPTION_EN,
    "fr": s.MARKETINGDESCRIPTION_FR
  },
  "construction": {
    "en": s.CONSTRUCTION_EN,
    "fr": s.CONSTRUCTION_FR
  },
  "fabricAndMaterials": {
    "en": s.FABRICANDMATERIALS_EN,
    "fr": s.FABRICANDMATERIALS_FR
  },
  "styleAndMeasurements": {
    "en": s.STYLEANDMEASUREMENTS_EN,
    "fr": s.STYLEANDMEASUREMENTS_FR
  },
  "careInstructions": {
    "en": s.CAREINSTRUCTIONS_EN,
    "fr": s.CAREINSTRUCTIONS_FR
  },
  "advice": {
    "en": s.ADVICE_EN,
    "fr": s.ADVICE_FR
  },
  "level1Category": {
    "en": s.LEVEL1CATEGORY_EN,
    "fr": s.LEVEL1CATEGORY_EN
  },
  "level2Category": {
    "en": s.LEVEL2CATEGORY_EN,
    "fr": s.LEVEL2CATEGORY_EN
  },
  "level3Category": {
    "en": s.LEVEL3CATEGORY_EN,
    "fr": s.LEVEL3CATEGORY_EN
  },
  "webStatus": {
    "en": s.WEBSTATUS,
    "fr": s.WEBSTATUS
  }
}))
```
