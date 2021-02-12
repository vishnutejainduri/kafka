if [ $1 = "inv" ]; then
  TOPIC_NAME="inventory-connect-jdbc-SKUINVENTORY"
elif  [ $1 = "returndetails" ]; then
  TOPIC_NAME="return-details-connect-jdbc"
elif  [ $1 = "stylesnew" ]; then
  TOPIC_NAME="styles-connect-jdbc-CATALOG_NEW"
elif  [ $1 = "styles" ]; then
  TOPIC_NAME="styles-connect-jdbc-CATALOG"
elif  [ $1 = "barcodes" ]; then
  TOPIC_NAME="barcodes-connect-jdbc"
elif  [ $1 = "saleprices" ]; then
  TOPIC_NAME="sale-prices-connect-jdbc"
elif  [ $1 = "shipments" ]; then
  TOPIC_NAME="shipments-connect-jdbc"
elif  [ $1 = "shipmentdetails" ]; then
  TOPIC_NAME="shipment-details-connect-jdbc"
elif  [ $1 = "salesorderdetails" ]; then
  TOPIC_NAME="sales-order-details-connect-jdbc"
elif  [ $1 = "salesorders" ]; then
  TOPIC_NAME="sales-orders-connect-jdbc"
elif  [ $1 = "facets" ]; then
  TOPIC_NAME="facets-connect-jdbc-STYLE_ITEM_CHARACTERISTICS_ECA"
elif  [ $1 = "mediacontainers" ]; then
  TOPIC_NAME="media-containers-connect-jdbc"
elif  [ $1 = "mediacontainers" ]; then
  TOPIC_NAME="media-containers-connect-jdbc"
elif  [ $1 = "medias" ]; then
  TOPIC_NAME="medias-connect-jdbc"
elif  [ $1 = "prices" ]; then
  TOPIC_NAME="prices-connect-jdbc"
elif  [ $1 = "skus" ]; then
  TOPIC_NAME="skus-connect-jdbc"
elif  [ $1 = "stores" ]; then
  TOPIC_NAME="stores-connect-jdbc"
elif  [ $1 = "stores" ]; then
  TOPIC_NAME="stores-connect-jdbc"
elif  [ $1 = "stylesbasic" ]; then
  TOPIC_NAME="styles-basic-connect-jdbc"
elif  [ $1 = "" ]; then
  TOPIC_NAME=""
else
  echo "Invalid topic name" 
  exit 1
fi
