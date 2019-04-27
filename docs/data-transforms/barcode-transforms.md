# Bar Code Queries and Transforms

## Bar Code Query
> **IMPORTANT!** This query does not have the timestamp fields

```sql
SELECT
  bar_code_id as code,
  style_id as styleId,
  sub_type as subType
FROM MERCH.IRO_POS_BARCODES
WHERE BUSINESS_UNIT_ID = 1
```

## Bar Code Transforms
No special transforms needed (aside from field renaming)

> The tool I used to export the query capitalized all the field names, that's why they're in all caps here

```js
return DB_BAR_CODES.map(b => ({
  "code": b.CODE,
  "styleId": b.STYLEID,
  "subType": b.SUBTYPE
}));
```