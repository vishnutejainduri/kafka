# JESTA Test SQL Queries for QA

NOTE: For fetching of any data from JESTA we should always use the latest kafka connector queries, located in `/kafkaConnectDeployment/connectors`

## Inventory Update
`UPDATE VSTORE.SKUINVENTORY i
  SET {Field-to-update} = {New value}, LASTMODIFIEDDATE = TIMESTAMP '2020-01-09 15:22:00.00'
  WHERE EXISTS(SELECT 1
  FROM VSTORE.SKUXREF sx
  WHERE i.FKSKU = sx.FKSKU AND i.INV_FKORGANIZATIONNO = sx.FKORGANIZATIONNO AND i.INV_FKSTYLENO = ‘{style_id}’ AND FKSKU = '{SKU_id}' AND i.FKSTORENO = {Store_ID});`

## Insert Price Change
`INSERT INTO MERCH.IRO_POS_PRICES
(BUSINESS_UNIT_ID, STYLE_ID, COLOR_ID, PRICE_CHANGE_ID , JOB_ID, RICHTER_VERSION_ID, POS_VERSION_ID, ACTIVITY_TYPE, DOWNLOAD_TYPE, PROCESS_DATE_CREATED, PROCESS_STATUS, NEW_RETAIL_PRICE, SITE_ID, START_DATE, END_DATE)
VALUES
(1, '20033027', '074', 99, 99999999999, 'V50', 'GENERIC', 'C', 'DAILY', TIMESTAMP '2020-09-01 14:49:00.00', 'P', 9.99, '00990', TIMESTAMP '2020-10-01 00:00:00', TIMESTAMP '2020-12-31 00:00:00' );`

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

## Update Fulfill Status for a Store
`UPDATE ELCAT.STOREFULLFILL
SET PICKUP = 'Y / N'
WHERE STORE_CD = '{site_id}'`

## Update Dept 27 Fulfill Status for a Store
`UPDATE ELCAT.DEPT27INV
SET DEPT27FF = 'Y / N', MODIFIEDDATE = TIMESTAMP '2020-03-30 12:25:00.00'
WHERE STORE_CD = '{site_id}'`

## Update Any Attribute for a Store
`UPDATE VSTORE.STORE
SET {Field Name} = ‘{Value}’, TIMESTAMP '2018-03-30 12:25:00.00'
WHERE PKSTORENO = {2 or 3 dig site_ID}`

## Update Threshold for a Sku
`UPDATE CUSTOM.THRESHOLDS
SET CURR_THRESHOLD = {Value} , LAST_MOD_DATE = TIMESTAMP '2020-01-09 14:46:00.00'
WHERE FKSKU ='{SKU_id}';`

## Update BRAND_ID for a Style
`UPDATE MERCH.STYLES   
SET BRAND_ID = '1/2/3'   
WHERE STYLE_ID = '20033027';`

- 1 = Main Store / 2 or 3 = Outlet

## Update Catalog Attribute for a Style
`UPDATE ELCAT.CATALOG   
  SET {Field} = '{Value}', LASTMODIFIEDDATE = TIMESTAMP '2020-09-01 14:24:00.00'       
  WHERE STYLEID = '{Style_ID}-00'`

## Update Style Colours Attribute for a Style  
`UPDATE ELCAT.STYLE_COLOURS   
  SET {field} = {value}, LAST_MODIFIED = TIMESTAMP '2020-06-15 12:43:00.00'        
  WHERE STYLEID = '{Style_ID}-00'; `

## Update a Facet
`UPDATE ELCAT.STYLE_ITEM_CHARACTERISTICS_ECA   
 SET {field} = {value}, LAST_MODIFIED = TIMESTAMP '2020-08-12 13:58:00.00'`

## Update a Sku
`UPDATE vstore.sku 
  SET {Field} = '{Value}', LASTMODIFIEDDATE = TIMESTAMP '2020-09-01 15:10:00.00'   
  WHERE PKSKU = '{SKU_ID}';`

## Update a Barcode
`UPDATE VSTORE.SKUXREF 
  SET PKPRODUCTNO = '89934867-99', SUBTYPE = 'UPCA', LASTMODIFIEDDATE = TIMESTAMP '2020-09-01 14:34:00.00'   
  WHERE FKSKU = '-2616172';`

## Insert a new Barcode
`INSERT INTO VSTORE.SKUXREF
  (LASTMODIFIEDDATE, FKORGANIZATIONNO, PKPRODUCTNO, SUBTYPE, FKSKU)
  VALUES
  (TIMESTAMP '2020-04-14 16:49:00', 1, 'BCCT04142020V2', 'EAN', '-2724585');`  

## Check for Errors in Order CSV
`select 
iso.wfe_trans_id 
,iso.process_status 
,iso.rejected_id 
,emt.description 
,iso.email_address 
from 
edom.iei_sales_orders iso 
left outer join edom.e_rejected_messages erm on erm.rejected_id = iso.rejected_id 
left outer join edom.e_message_texts emt on emt.message_id = erm.message_id
where iso.wfe_trans_id = '{Order Number}'`

- If Process_Status = “P”, it means the CSV was correctly processed
- If Process_Status = “N”, it means it’s in progress or there is some error
- To check if there is an error, proceed to the following

## Get Order Process Job ID
`select * from edom.trace_output_table tot where message like '%{Order Number}%'`

- Read through the logs until you spot something that says “Error” or “Exception” or anything that looks like a problem :shrug:
- Then pick the JOB_ID from the last column

## Get Order Processing Error
`select * from edom.trace_output_table tot where job_id = '{Job_ID}'`

## Get Order Header

`SELECT *
FROM Edom.e_sales_orders
WHERE wfe_trans_id = '{Order Number}'`

## Get Order Details
`SELECT *
FROM Edom.e_sales_order_details
WHERE SALES_ORDER_ID = {Value from previous query}`

## Get Order Payment Info (Tenders)

`SELECT *
FROM Edom.e_sales_order_tenders
WHERE SALES_ORDER_ID = {Value from previous query}`
