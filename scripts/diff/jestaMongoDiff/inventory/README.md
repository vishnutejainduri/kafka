# Comparing Inventory data between Jesta and Mongo
This script compares the data from the table gererated on the `skuinventory-jdbc-source.json` connector.
Which, at the point at this comparison has been written is this one:
`WITH s_row AS(SELECT DISTINCT m_row$$ FROM vstore.MLOG$_SKUINVENTORY), s_res AS( SELECT i.FKSKU as SKU_ID, sc.IMAGE_STYLEID as STYLE_ID, i.FKSTORENO AS STORE_ID, i.CHECKIND, i.QOH, i.QOHSELLABLE, i.QOHNOTSELLABLE, i.QOO, i.QBO, i.QIT, i.QIP, i.LASTMODIFIEDDATE, i.INV_FKORGANIZATIONNO FROM s_row JOIN VSTORE.SKUINVENTORY i on s_row.m_row$$ = i.rowid INNER JOIN (SELECT SKUCOLOR, PKSKU FROM VSTORE.SKU) s ON i.FKSKU = s.PKSKU INNER JOIN ELCAT.STYLE_COLOURS sc ON SUBSTR(sc.STYLEID, 1, 8) = i.INV_FKSTYLENO AND sc.COLOUR_ID = s.SKUCOLOR WHERE i.LASTMODIFIEDDATE >= DATE '2020-09-17') SELECT * FROM s_res`

The `skuinventory.csv` file is the result of the view (which currently lasts 4 days) extracted to a csv.

To do this comparison, I've deployed a recovery connector with this exact query and set it to run every 24h (so after it ran once I could remove it).

After the offset execution has been completed I ran the script to compare if the data sent to our mongo was matching the data was on the view.

Comparing the `quantityOnHandSellable` is the most important thing, because that's what controls inventory inside harryrosen.