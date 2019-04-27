# Color Queries and Transforms

## Color Query
> **IMPORTANT!** This query does not have the timestamp fields

> **Note** I could not find the french translation for colors

```sql
SELECT
  color_id as id,
  "description" as description_EN
FROM MERCH.COLORS;
```

## Color Transforms
No special transforms needed (aside from field renaming)

> The tool I used to export the query capitalized all the field names, that's why they're in all caps here

```js
return DB_COLORS.map(c => ({
  "id": c.ID,
  "description": {
    "en": c.DESCRIPTION_EN,
    "fr": null
  },
}));
```