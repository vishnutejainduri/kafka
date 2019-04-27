# Price Queries and Transforms

> **WARNING!** The price API is the one that needs more work.

We didn't come up with a query to extract the correct regular price, sale price or discout.


## Price Query
> **IMPORTANT!** This query does not have the timestamp fields

### Regular query
```sql
SELECT
  STYLE_ID AS styleId,
  ORIGINAL_RETAIL_PRICE AS originalPrice,
  RETAIL_PRICE AS price
FROM MERCH.PRICES;
```

### Possibly helpful (but complex) queries sent by HR
```sql
SELECT style_id,
       case when substr(trim(to_char(retail_price,'9999999.99')),length(trim(to_char(retail_price,'9999999.99'))),1) = '9' then original_retail_price else retail_price end as retail_price,
       start_date,
       end_date
FROM merch.prices p
WHERE business_unit_id = 1
    AND zone_id = '1'
    AND start_date <= trunc(sysdate)
    AND nvl(end_date, trunc(sysdate)+1) >= trunc(sysdate)
    AND substr(original_retail_price,-1) != '9'
--     AND p.style_id = '53771352';
ORDER BY style_id;
```

```sql
SELECT ipp.style_id, ipp.new_retail_price, ipp.start_date,
         case when ipp.new_retail_price <> cur.new_retail_price and ipp.start_date < trunc(sysdate) and ipp.end_date is null then
           cur.start_date+1 else nvl(ipp.end_date+1,'1-jan-2525') end as end_date
    FROM merch.iro_pos_prices ipp,
         (
           SELECT style_id, new_retail_price, start_date, end_date
             FROM merch.iro_pos_prices
            WHERE style_id = '53771352'
              AND site_id = '00990'
              AND business_unit_id = 1
              AND trunc(sysdate) BETWEEN start_date AND nvl(end_date,'1-jan-2525')
              AND start_date = (
                    SELECT max(start_date)
                      FROM merch.iro_pos_prices
                     WHERE style_id = '53771352'
                       AND site_id = '00011'
                       AND business_unit_id = 1
                       AND trunc(sysdate) BETWEEN start_date AND nvl(end_date,'1-jan-2525'))
         ) cur
   WHERE ipp.style_id = '53771352'
     AND ipp.site_id = '00011'
     AND substr(ipp.new_retail_price,-3) = '.99'
     AND ipp.business_unit_id = 1
     AND ipp.style_id = cur.style_id
   GROUP BY ipp.style_id, ipp.new_retail_price, ipp.start_date, case when ipp.new_retail_price <> cur.new_retail_price and ipp.start_date < trunc(sysdate) and ipp.end_date is null then
           cur.start_date+1 else nvl(ipp.end_date+1,'1-jan-2525') end
   ORDER BY ipp.start_date;
```

## Price Transforms
> The tool I used to export the query capitalized all the field names, that's why they're in all caps here

```js
return DB_PRICE.map(p => ({
  "styleId": p.STYLEID,
  "price": p.PRICE,
  "originalPrice": p.ORIGINALPRICE,
  "discount": calcDiscount(p.ORIGINALPRICE, p.PRICE) // ****
}));

// **** This should probably live on the API, instead of here
const calcDiscount = (originalPrice, price) => {
  const discount = Math.round(((1 - price/originalPrice) * 100));
  return Number.isNaN(discount) ? 0 : discount;
}
```