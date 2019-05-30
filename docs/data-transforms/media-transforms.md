# Media Queries and Transforms

The media data will be split into 2 collections: `medias`, and `mediaContainers`;

The `media` collection will contain data from the `harp.medias` table. Each
individual image has an entry on this table (e.g. the many crops of a product image).
Same images with different crops are related via a `image container`.

The `mediaContainers` collection will contain data linking one `style` to many `image containers`.
This information comes from the `harp.products` table.


> `1` Style -> `N` x image_containers -> `M` x images

## Medias

### Media Query
> **IMPORTANT!** This query does not have the timestamp fields

The query below
```sql
SELECT
  m.pk AS ID,
  m.p_mediacontainer AS CONTAINER_ID,
  mf.p_qualifier as QUALIFIER,
  CASE WHEN m.p_location IS NULL THEN '' ELSE 'http://www.harryrosen.com/medias/sys_master/'||m.p_location END AS image_path
FROM harp.medias m
JOIN harp.mediaformat mf on m.p_mediaformat = mf.pk
WHERE mf.p_qualifier IN ('HRCARTICON', 'HRDEFAULT', 'HRPRODUCT', 'HRSTORE', 'HRTHUMBNAIL', 'HRZOOM')
```

### Media Transforms
> The tool I used to export the query capitalized all the field names, that's why they're in all caps here

I stumbled across a images with `null` container IDs. Since for our use case they
don't matter, I filtered them out (products refer to containers, not images).

```js
return DB_MEDIAS.filter(i => i.ID && i.CONTAINER_ID)
  .map(img => ({
    "id": `${img.ID}`,
    "containerId": `${img.CONTAINER_ID}`,
    "qualifier": img.QUALIFIER,
    "url": img.IMAGE_PATH,
  }));
```

## Media Containers

### Media Container Query
> **IMPORTANT!** This query does not have the timestamp fields

```sql
SELECT p.code, p.p_galleryimages
FROM harp.products p
JOIN harp.catalogversions cav ON p.p_Catalogversion = cav.pk AND cav.p_version = 'Online'
JOIN harp.catalogs ca on cav.p_catalog = ca.pk and ca.p_id = 'harryrosenProductCatalog'
WHERE p.p_approvalstatus = '8796096954459'
```

### Media Container Transform
> The tool I used to export the query capitalized all the field names, that's why they're in all caps here

The format of the `P_GALLERYIMAGES` field is this:
```
',#1,8798224810034,8798782586930,8798782619698,8798782652466,'
```

When I used the code below, I assumed that the first image code in that string
was the main image.

This happens to be true, but today I found out that the `#1` is what actually tells
which image is the main (`#1`-> first one), but it just so happens that today all
products have `#1`.

The code below does not take that new information into account, it just throws away
anything that is not only composed by digits, and asumes the first one is the main one.

> **Note 1:** The query they gave me initially, used a substring function to extract
> the main image as the first result (so picking the first should be enough).
>
> `JOIN harp.medias m on substr(p.p_galleryimages,7,13) = m.p_mediacontainer`
> 
> But the interesting thing is that the index of the substring function was off
> by two characters, leading me to think that this string may be slightly different
> on the production database.
> 
> `JOIN harp.medias m on substr(p.p_galleryimages,5,13) = m.p_mediacontainer`
> 
> I think that, for now, it's safer to ignore the `#1` and just use the snippet
> below.

> **Note 2:** Turns out that in production, the `P_GALLERYIMAGES` looks like this:
>
> `'\\,#1\\,8809530622002\\,8809530654770\\,'`
>
> It has double backslash before each comma. That's probably the reason the `substr` call mentioned above.
> To work around that, we've added `.replace(/\\,/g, ',')` to the script below. This change should still work
> on both cases (prod and dev)

```js
const result = [];

for(let item of DB_MEDIA_CONTAINERS) {
  const ids = (item && item.P_GALLERYIMAGES)
    ? item.P_GALLERYIMAGES.replace(/\\,/g, ',').split(',').filter(id => id.match(/^\d+$/))
    : [];

  for (let containerId of ids) {
    result.push({
      code: item.CODE,
      mediaContainerId: containerId,
      isMain: containerId === ids[0]
    });
  }
}

return result;
```
