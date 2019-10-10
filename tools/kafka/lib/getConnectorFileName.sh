if [ $1 = "inv" ]; then
  CONNECTOR_FILE_NAME="skuinventory-jdbc-source.json"
elif  [ $1 = "invbulk" ]; then
  CONNECTOR_FILE_NAME="skuinventory-jdbc-source-bulk.json"
elif  [ $1 = "invfast" ]; then
  CONNECTOR_FILE_NAME="inventory-fast-load-jdbc.json"
elif  [ $1 = "facets" ]; then
  CONNECTOR_FILE_NAME="facets-jdbc-source.json"
elif  [ $1 = "fail" ]; then
  CONNECTOR_FILE_NAME="failing-connector-test.json"
elif  [ $1 = "styles" ]; then
  CONNECTOR_FILE_NAME="elcat-catalog-jdbc-source.json"
elif  [ $1 = "stylesaudit" ]; then
  CONNECTOR_FILE_NAME="elcat-catalog-audit-jdbc-source.json"
else
  echo "Invalid connector type" 
  exit 1
fi
