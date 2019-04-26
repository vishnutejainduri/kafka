# SKU Queries and Transforms

## SKU Query
> Please note that the ID for the SKU is not the primary key (`pksku`) of the `vstore.sku` table
> but the field `pkproductno` of the `vstore.skuxref` table

```sql
SELECT
  sx.pkproductno as id,
  s.fkstyleno as styleId,
  s.skusize as "size",
  s.fksizeno as sizeId,
  s.skudimension as dimension,
  s.skucolor as colorId
FROM vstore.sku s
JOIN vstore.skuxref sx ON s.pksku = sx.fksku
  AND s.fkorganizationno = sx.fkorganizationno
WHERE s.fkorganizationno = 1
```

## SKU Transforms
No special transforms needed (aside from field renaming)

> The tool I used to export the query capitalized all the field names, that's why they're in all caps here

```js
return DB_SKUS.map(s => ({
  "id": s.ID,
  "styleId": s.STYLEID,
  "colorId": s.COLORID,
  "sizeId": s.size,
  "dimensionId": s.DIMENSION
}));
```