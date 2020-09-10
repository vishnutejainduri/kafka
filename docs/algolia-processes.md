# Algolia Fields and Processes

The platform builds and updates an algolia search index based on data contained within our MongoDB. The index is made up of style documents, where we sync all mongo related style fields with `updateAlgoliaStyle`. This is the base straightforward cloud function that simply creates style documents for algolia to index. There are a number of extra fields and jobs that create them. These are documented below.

## Inventory Updates
`UPDATE VSTORE.SKUINVENTORY i
  SET {Field-to-update} = {New value}, LASTMODIFIEDDATE = TIMESTAMP '2020-01-09 15:22:00.00'
  WHERE EXISTS(SELECT 1
  FROM VSTORE.SKUXREF sx
  WHERE i.FKSKU = sx.FKSKU AND i.INV_FKORGANIZATIONNO = sx.FKORGANIZATIONNO AND i.INV_FKSTYLENO = ‘{style_id}’ AND FKSKU = '{SKU_id}' AND i.FKSTORENO = {Store_ID});`

## Price Updates
`INSERT INTO MERCH.IRO_POS_PRICES
(BUSINESS_UNIT_ID, STYLE_ID, COLOR_ID, PRICE_CHANGE_ID , JOB_ID, RICHTER_VERSION_ID, POS_VERSION_ID, ACTIVITY_TYPE, DOWNLOAD_TYPE, PROCESS_DATE_CREATED, PROCESS_STATUS, NEW_RETAIL_PRICE, SITE_ID, START_DATE, END_DATE)
VALUES
(1, '20033027', '074', 99, 99999999999, 'V50', 'GENERIC', 'C', 'DAILY', TIMESTAMP '2020-09-01 14:49:00.00', 'P', 9.99, '00990', TIMESTAMP '2020-10-01 00:00:00', TIMESTAMP '2020-12-31 00:00:00' );`

- Make sure the Colour_ID is correct

## Outlet Updates

## Facet Updates

## Other
