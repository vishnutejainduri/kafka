# Stores Queries and Transforms

## Stores Query
> **IMPORTANT!** This query does not have the timestamp fields

```sql
SELECT
  BUSINESS_UNIT_ID,
  SUB_TYPE,
  SITE_ID,
  DAYS_OPEN_PER_WEEK,
  "NAME", -- Quotes needed: reserved word
  ADDRESS_1,
  ADDRESS_2,
  ADDRESS_3,
  ADDRESS_4,
  CITY,
  STATE_ID,
  ZIP_CODE,
  COUNTRY_ID,
  TELEPHONE,
  FAX,
  LATITUDE,
  LONGITUDE
FROM MERCH.SITES
```

## Stores Transforms
No special transforms needed (aside from field renaming)

> The tool I used to export the query capitalized all the field names, that's why they're in all caps here

```js
return DB_STORE.map(s => ({
  id: s.SITE_ID,
  businessUnitId: s.BUSINESS_UNIT_ID,
  subType: s.SUB_TYPE,
  daysOpenPerWeek: s.DAYS_OPEN_PER_WEEK,
  name: s.NAME,
  address1: s.ADDRESS_1,
  address2: s.ADDRESS_2,
  address3: s.ADDRESS_3,
  address4: s.ADDRESS_4,
  city: s.CITY,
  stateId: s.STATE_ID,
  countryId: s.COUNTRY_ID,
  zipCode: s.ZIP_CODE,
  telephone: s.TELEPHONE,
  fax: s.FAX,
  latitude: s.LATITUDE,
  longitude: s.LONGITUDE,
  operationalStatus: s.OPERATIONAL_STATUS,
  siteMgrEmployeeId: s.SITE_MGR_EMPLOYEE_ID,
  siteMgrSubType: s.SITE_MGR_SUB_TYPE
}));
```
