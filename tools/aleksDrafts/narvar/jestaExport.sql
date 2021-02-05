SELECT eso.WFE_TRANS_ID AS ORDER_NUMBER, COUNT(*) AS LINE_ITEM_COUNT, shipments.SHIPMENT_LINE_ITEM_COUNT
FROM EDOM.E_SALES_ORDER_DETAILS esod
INNER JOIN EDOM.E_SALES_ORDERS eso ON eso.SALES_ORDER_ID = esod.SALES_ORDER_ID
LEFT JOIN (SELECT eso.SALES_ORDER_ID, COUNT(*) AS SHIPMENT_LINE_ITEM_COUNT
    FROM EDOM.E_SHIPMENT_DETAILS esd
    INNER JOIN EDOM.E_SHIPMENTS es ON es.SHIPMENT_ID = esd.SHIPMENT_ID
    INNER JOIN EDOM.E_SALES_ORDER_DETAILS esod ON esod.SALES_ORDER_ID = es.SALES_ORDER_ID AND esod.LINE = esd.SALES_ORDER_LINE_ID
    INNER JOIN EDOM.E_SALES_ORDERS eso ON eso.SALES_ORDER_ID = esod.SALES_ORDER_ID
    WHERE eso.SITE_ID = '00990' AND esd.TRACKING_NUMBER IS NOT NULL
    GROUP BY eso.SALES_ORDER_ID) shipments ON shipments.SALES_ORDER_ID = eso.SALES_ORDER_ID
WHERE eso.SITE_ID = '00990'
GROUP BY eso.WFE_TRANS_ID, shipments.SHIPMENT_LINE_ITEM_COUNT
