# JESTA Test SQL Queries for QA

NOTE: For fetching of any data from JESTA we should always use the latest kafka connector queries, located in `/kafkaConnectDeployment/connectors`

## Inventory Update
UPDATE VSTORE.SKUINVENTORY i
  SET {Field-to-update} = {New value}, LASTMODIFIEDDATE = TIMESTAMP '2020-01-09 15:22:00.00'
  WHERE EXISTS(SELECT 1
  FROM VSTORE.SKUXREF sx
  WHERE i.FKSKU = sx.FKSKU AND i.INV_FKORGANIZATIONNO = sx.FKORGANIZATIONNO AND i.INV_FKSTYLENO = ‘{style_id}’ AND FKSKU = '{SKU_id}' AND i.FKSTORENO = {Store_ID});

## Insert Price Change
INSERT INTO MERCH.IRO_POS_PRICES
(BUSINESS_UNIT_ID, STYLE_ID, COLOR_ID, PRICE_CHANGE_ID , JOB_ID, RICHTER_VERSION_ID, POS_VERSION_ID, ACTIVITY_TYPE, DOWNLOAD_TYPE, PROCESS_DATE_CREATED, PROCESS_STATUS, NEW_RETAIL_PRICE, SITE_ID, START_DATE, END_DATE)
VALUES
(1, '20033027', '074', 99, 99999999999, 'V50', 'GENERIC', 'C', 'DAILY', TIMESTAMP '2020-09-01 14:49:00.00', 'P', 9.99, '00990', TIMESTAMP '2020-10-01 00:00:00', TIMESTAMP '2020-12-31 00:00:00' );
- Make sure the Colour_ID is correct
- Add a different Price_Change_ID for every price change
- Make sure price ends in .99
- Process Date Created is the connector’s timestamp
- For temporary markdown, set an End Date for the price change
- For permanent markdown, set End Date = null
- Dates are in Eastern time
- For Deletion Records, set Activity_Type to “D”
- Activity_Type “A” or “C” are treated the same and both do upserts
- If you want to update a price change in CT / Mongo, you need to insert a new row where only the price is different


