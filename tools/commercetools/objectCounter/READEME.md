# Object Counter
## Setup
To use the object counter script start by installing node modules (the usual way):

```
npm install
```

Setup your `.env` file and make sure it contains the following (there should be a set for each environment you want, example is for development where keys should end with DEVELOPMENT):

```
PROJECT_KEY_DEVELOPMENT='harryrosen-development'
CLIENT_ID_DEVELOPMENT='clientIdDevelopment'
CLIENT_SECRET_DEVELOPMENT='clientSecretDevelopment'
```

## Execution
Start with `node ./index.js` and pass in two arguments, the first is the environment name e.g. `development` and the second argument is the entity type e.g. `variants`. Passing `all` as the data type will count everything in one command.

The script will take a while to run (on roughly 150k products, about 10mins), but will log out the current product count it's at as it goes (to help you know how far along it is, compare with total products in Merchant Center).
When finished it will log out the following (varies based on data type): 
- `productTotal`: total number of products found
- `variantTotal`: total number of variants found
- `imageTotal`: total number of images found
- `barcodeTotal`: total number of barcodes found
- `priceTotal`: total number of price rows found

### Validation
Each of these numbers should be compared with a total count in Jesta (DEV or PROD depending on corresponding commercetools environment). Below are some sample queries to run for each type, and a currently running kafka connector that sends this data.

#### Variants
```
SELECT COUNT(*)OVER 
FROM vstore.sku s
INNER JOIN ELCAT.STYLE_COLOURS sc ON SUBSTR(sc.STYLEID,1,8) = s.fkstyleno AND sc.COLOUR_ID = s.skucolor
INNER JOIN ELCAT.SIZE_TRANSLATION st ON st.SIZE_MERCH = s.SKUSIZE AND s.FKORGANIZATIONNO = 1 AND styleId IS NOT NULL
```
Connector: `skus-jdbc-source`

#### Images
Images no longer have a connector, all images come from Amplience which we currently have no good way of counting total images in.
However, valid or invalid, we should have images for every variant in commercetools. So, the total image count should always equal the total variant count.

#### Barcodes
```
SELECT COUNT(*)OVER
FROM VSTORE.SKUXREF sx
INNER JOIN (SELECT PKSKU, SKUCOLOR, FKSTYLENO FROM VSTORE.SKU) s ON sx.FKSKU = s.PKSKU
INNER JOIN ELCAT.STYLE_COLOURS sc ON SUBSTR(sc.STYLEID,1,8) = s.fkstyleno AND sc.COLOUR_ID = s.skucolor AND styleId IS NOT NULL AND sx.FKORGANIZATIONNO = 1
```
Connector: `barcodes-jdbc-source`

#### Prices
```
SELECT COUNT(*)OVER
FROM MERCH.IRO_POS_PRICES
INNER JOIN ELCAT.STYLE_COLOURS sc ON SUBSTR(sc.STYLEID,1,8) = STYLE_ID AND sc.COLOUR_ID = COLOR_ID AND SITE_ID in ('00990', '00011') 
AND BUSINESS_UNIT_ID = 1 AND PRICE_CHANGE_ID IS NOT NULL AND START_DATE IS NOT NULL
```
Connector: `sale-prices-jdbc-source`
NOTE: The above query does not handle deletions, the result from `objectCounter.js` will handle deletions and so will always have a smaller number than Jesta.
Eventually, a query built for Jesta that handles deletions and overlapping invalid prices could be built to more easily compare numbers.
