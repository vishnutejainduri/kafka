# Inventory Queries and Transforms

## Inventory Query
> **IMPORTANT!** This query does not have the timestamp fields

```sql
SELECT
  sx.pkproductno   as id,
  i.inv_fkstyleno  as styleId,
  i.fkstoreno      as storeId,
  i.qoh            as quantityOnHand,
  i.qohsellable    as quantityOnHandSellable,
  i.qohnotsellable as quantityOnHandNotSellable,
  i.qoo            as quantityOnOrder,
  i.qbo            as quantityBackOrder
  i.qit            as quantityInTransit
FROM VSTORE.SKUINVENTORY i
JOIN VSTORE.SKUXREF sx ON i.fksku = sx.fksku
  AND i.inv_fkorganizationno = sx.fkorganizationno
WHERE i.inv_fkorganizationno = 1
```

## Inventory Transforms
We need to left-pad the storeId with `0`s (5 characters total) to match the format on the `sites` table
(source of the stores information).

> The tool I used to export the query capitalized all the field names, that's why they're in all caps here

```js
return DB_ENTITY.map(i => ({
  "styleId": i.STYLEID,
  "skuId": i.SKUID,
  "storeId": i.STOREID && `${i.STOREID}`.padStart(5, '0'),
  "quantityOnHand": i.QUANTITYONHAND,
  "quantityOnHandSellable": i.QUANTITYONHANDSELLABLE,
  "quantityOnHandNotSellable": i.QUANTITYONHANDNOTSELLABLE,
  "quantityInTransit": i.QUANTITYINTRANSIT,
  "quantityOnOrder": i.QUANTITYONORDER,
  "quantityBackOrder": i.QUANTITYBACKORDER,
}));
```
