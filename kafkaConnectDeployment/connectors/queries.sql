-- Formatted using DBEAVER v7

-- barcodes-jdbc-source
SELECT
	sx.LASTMODIFIEDDATE,
	sx.PKPRODUCTNO AS barcode,
	sx.SUBTYPE,
	s.PKSKU AS SKU_ID,
	sc.IMAGE_STYLEID AS styleId,
	sx.FKORGANIZATIONNO
FROM
	VSTORE.SKUXREF sx
INNER JOIN (
	SELECT
		PKSKU, SKUCOLOR, FKSTYLENO
	FROM
		VSTORE.SKU) s ON
	sx.FKSKU = s.PKSKU
INNER JOIN ELCAT.STYLE_COLOURS sc ON
	SUBSTR(sc.STYLEID, 1, 8) = s.fkstyleno
	AND sc.COLOUR_ID = s.skucolor
	AND styleId IS NOT NULL
	AND sx.FKORGANIZATIONNO = 1

-- barcodes-jdbc-source-recovery
SELECT
	sx.LASTMODIFIEDDATE,
	sx.PKPRODUCTNO AS barcode,
	sx.SUBTYPE,
	s.PKSKU AS SKU_ID,
	sc.IMAGE_STYLEID AS styleId,
	sx.FKORGANIZATIONNO
FROM
	VSTORE.SKUXREF sx
INNER JOIN (
	SELECT
		PKSKU, SKUCOLOR, FKSTYLENO
	FROM
		VSTORE.SKU) s ON
	sx.FKSKU = s.PKSKU
INNER JOIN ELCAT.STYLE_COLOURS sc ON
	SUBSTR(sc.STYLEID, 1, 8) = s.fkstyleno
	AND sc.COLOUR_ID = s.skucolor
	AND styleId IS NOT NULL
	AND sx.FKORGANIZATIONNO = 1
WHERE
	sx.LASTMODIFIEDDATE >= sysdate - INTERVAL '300' MINUTE

---

-- elcat-catalog-audit-jdbc-source
SELECT
	*
FROM
	(
	SELECT
		STYLE_COLOURS.IMAGE_STYLEID AS STYLEID, CATALOG.SUBDEPT, CATALOG.BRAND_NAME_ENG, CATALOG.BRAND_NAME_FR, CATALOG.DESC_ENG, CATALOG.DESC_FR, CATALOG.MARKET_DESC_ENG, CATALOG.MARKET_DESC_FR, CATALOG.DETAIL_DESC3_ENG, CATALOG.DETAIL_DESC3_FR, CATALOG.FABRICANDMATERIAL_EN, CATALOG.FABRICANDMATERIAL_FR, CATALOG.SIZE_DESC_ENG, CATALOG.SIZE_DESC_FR, CATALOG.CAREINSTRUCTIONS_EN, CATALOG.CAREINSTRUCTIONS_FR, CATALOG.ADVICE_EN, CATALOG.ADVICE_FR, STYLE_COLOURS.COLOUR_DESC_ENG, STYLE_COLOURS.COLOUR_DESC_FR, NVL(L1I.VALUE_EN, CATALOG.CATAGORY) AS CATEGORY_EN, NVL(L1I.VALUE_FR, CATALOG.CATAGORY) AS CATEGORY_FR, NVL(L2I.VALUE_EN, CATALOG.CATAGORY_LEVEL_1A) AS CATEGORY_LEVEL_1A_EN, NVL(L2I.VALUE_FR, CATALOG.CATAGORY_LEVEL_1A) AS CATEGORY_LEVEL_1A_FR, NVL(L3I.VALUE_EN, CATALOG.CATAGORY_LEVEL_2A) AS CATEGORY_LEVEL_2A_EN, NVL(L3I.VALUE_FR, CATALOG.CATAGORY_LEVEL_2A) AS CATEGORY_LEVEL_2A_FR, CATALOG.WEBSTATUS, CATALOG.SEASON_CD, STYLE_COLOURS.COLOUR_ID AS COLORID, CATALOG.UNIT_PRICE, CATALOG.VSN AS VSN, CATALOG.SUBCLASS, CAST(CATALOG.SIZE_CHART AS NUMBER(13)) AS SIZE_CHART, CATALOG.EFFECTIVE_DATE AS CREATED_DATE, CA.UPD_TIMESTAMP AS CA_UPD_TIMESTAMP, SCA.UPD_TIMESTAMP AS SCA_UPD_TIMESTAMP, GREATEST( COALESCE(CA.UPD_TIMESTAMP, SCA.UPD_TIMESTAMP), COALESCE(SCA.UPD_TIMESTAMP, CA.UPD_TIMESTAMP) ) AS UPD_TIMESTAMP, GREATEST( COALESCE(CA.UPD_TIMESTAMP, SCA.UPD_TIMESTAMP), COALESCE(SCA.UPD_TIMESTAMP, CA.UPD_TIMESTAMP) ) AS LAST_MODIFIED_DATE, CATALOG.ONLINEFROMDATE, STYLE_COLOURS.COLOURGROUP_EN AS TRUE_COLOURGROUP_EN, STYLE_COLOURS.COLOURGROUP_FR AS TRUE_COLOURGROUP_FR
	FROM
		(
		SELECT
			STYLEID, MAX(UPD_TIMESTAMP) AS UPD_TIMESTAMP
		FROM
			ELCAT.CATALOG_AUDIT
		GROUP BY
			STYLEID ) CA
	INNER JOIN ELCAT.CATALOG ON
		CATALOG.STYLEID = ca.STYLEID
	INNER JOIN ELCAT.STYLE_COLOURS ON
		STYLE_COLOURS.STYLEID = CATALOG.STYLEID
	LEFT JOIN ELCAT.DICTIONARYITEM L1I ON
		LOWER(L1I.CODE) = LOWER(CATALOG.CATAGORY)
		AND L1I.DICTIONARYID = 1
	LEFT JOIN ELCAT.DICTIONARYITEM L2I ON
		LOWER(L2I.CODE) = LOWER(CATALOG.CATAGORY_LEVEL_1A)
		AND L2I.DICTIONARYID = 2
	LEFT JOIN ELCAT.DICTIONARYITEM L3I ON
		LOWER(L3I.CODE) = LOWER(CATALOG.CATAGORY_LEVEL_2A)
		AND L3I.DICTIONARYID = 3
	LEFT JOIN (
		SELECT
			STYLEID, MAX(UPD_TIMESTAMP) AS UPD_TIMESTAMP
		FROM
			ELCAT.STYLE_COLOURS_AUDIT
		GROUP BY
			STYLEID ) SCA ON
		STYLE_COLOURS.STYLEID LIKE CONCAT(SCA.STYLEID, '-%')
	WHERE
		STYLE_COLOURS.IMAGE_STYLEID IS NOT NULL )

-- elcat-catalog-audit-jdbc-source-recovery
SELECT STYLE_COLOURS.IMAGE_STYLEID AS STYLEID,
    CATALOG.SUBDEPT,
    CATALOG.BRAND_NAME_ENG,
    CATALOG.BRAND_NAME_FR,
    CATALOG.DESC_ENG,
    CATALOG.DESC_FR,
    CATALOG.MARKET_DESC_ENG,
    CATALOG.MARKET_DESC_FR,
    CATALOG.DETAIL_DESC3_ENG,
    CATALOG.DETAIL_DESC3_FR,
    CATALOG.FABRICANDMATERIAL_EN,
    CATALOG.FABRICANDMATERIAL_FR,
    CATALOG.SIZE_DESC_ENG,
    CATALOG.SIZE_DESC_FR,
    CATALOG.CAREINSTRUCTIONS_EN,
    CATALOG.CAREINSTRUCTIONS_FR,
    CATALOG.ADVICE_EN,
    CATALOG.ADVICE_FR,
    STYLE_COLOURS.COLOUR_DESC_ENG,
    STYLE_COLOURS.COLOUR_DESC_FR,
    NVL(L1I.VALUE_EN, CATALOG.CATAGORY) AS CATEGORY_EN,
    NVL(L1I.VALUE_FR, CATALOG.CATAGORY) AS CATEGORY_FR,
    NVL(L2I.VALUE_EN, CATALOG.CATAGORY_LEVEL_1A) AS CATEGORY_LEVEL_1A_EN,
    NVL(L2I.VALUE_FR, CATALOG.CATAGORY_LEVEL_1A) AS CATEGORY_LEVEL_1A_FR,
    NVL(L3I.VALUE_EN, CATALOG.CATAGORY_LEVEL_2A) AS CATEGORY_LEVEL_2A_EN,
    NVL(L3I.VALUE_FR, CATALOG.CATAGORY_LEVEL_2A) AS CATEGORY_LEVEL_2A_FR,
    CATALOG.WEBSTATUS,
    CATALOG.SEASON_CD,
    STYLE_COLOURS.COLOUR_ID AS COLORID,
    CATALOG.UNIT_PRICE,
    CATALOG.VSN AS VSN,
    CATALOG.SUBCLASS,
    CAST(CATALOG.SIZE_CHART AS NUMBER(13)) AS SIZE_CHART,
    CATALOG.EFFECTIVE_DATE AS CREATED_DATE,
    CA.UPD_TIMESTAMP AS CA_UPD_TIMESTAMP,
    SCA.UPD_TIMESTAMP AS SCA_UPD_TIMESTAMP,
    GREATEST(
        COALESCE(CA.UPD_TIMESTAMP, SCA.UPD_TIMESTAMP),
        COALESCE(SCA.UPD_TIMESTAMP, CA.UPD_TIMESTAMP)
    ) AS UPD_TIMESTAMP,
    GREATEST(
        COALESCE(CA.UPD_TIMESTAMP, SCA.UPD_TIMESTAMP),
        COALESCE(SCA.UPD_TIMESTAMP, CA.UPD_TIMESTAMP)
    ) AS LAST_MODIFIED_DATE,
    CATALOG.ONLINEFROMDATE,
    STYLE_COLOURS.COLOURGROUP_EN AS TRUE_COLOURGROUP_EN,
    STYLE_COLOURS.COLOURGROUP_FR AS TRUE_COLOURGROUP_FR
FROM(
        SELECT STYLEID,
            MAX(UPD_TIMESTAMP) AS UPD_TIMESTAMP
        FROM ELCAT.CATALOG_AUDIT
        GROUP BY STYLEID
    ) CA
    INNER JOIN ELCAT.CATALOG ON CATALOG.STYLEID = ca.STYLEID
    INNER JOIN ELCAT.STYLE_COLOURS ON STYLE_COLOURS.STYLEID = CATALOG.STYLEID
    LEFT JOIN ELCAT.DICTIONARYITEM L1I ON LOWER(L1I.CODE) = LOWER(CATALOG.CATAGORY)
    AND L1I.DICTIONARYID = 1
    LEFT JOIN ELCAT.DICTIONARYITEM L2I ON LOWER(L2I.CODE) = LOWER(CATALOG.CATAGORY_LEVEL_1A)
    AND L2I.DICTIONARYID = 2
    LEFT JOIN ELCAT.DICTIONARYITEM L3I ON LOWER(L3I.CODE) = LOWER(CATALOG.CATAGORY_LEVEL_2A)
    AND L3I.DICTIONARYID = 3
    LEFT JOIN (
        SELECT STYLEID,
            MAX(UPD_TIMESTAMP) AS UPD_TIMESTAMP
        FROM ELCAT.STYLE_COLOURS_AUDIT
        GROUP BY STYLEID
    ) SCA ON STYLE_COLOURS.STYLEID LIKE CONCAT(SCA.STYLEID, '-%')
WHERE STYLE_COLOURS.IMAGE_STYLEID IS NOT NULL
    AND CA.UPD_TIMESTAMP >= sysdate - INTERVAL '300' MINUTE
---

-- elcat-catalog-jdbc-source
SELECT
	*
FROM
	(
	SELECT
		STYLE_COLOURS.IMAGE_STYLEID AS STYLEID, CATALOG.SUBDEPT, CATALOG.BRAND_NAME_ENG, CATALOG.BRAND_NAME_FR, CATALOG.DESC_ENG, CATALOG.DESC_FR, CATALOG.MARKET_DESC_ENG, CATALOG.MARKET_DESC_FR, CATALOG.DETAIL_DESC3_ENG, CATALOG.DETAIL_DESC3_FR, CATALOG.FABRICANDMATERIAL_EN, CATALOG.FABRICANDMATERIAL_FR, CATALOG.SIZE_DESC_ENG, CATALOG.SIZE_DESC_FR, CATALOG.CAREINSTRUCTIONS_EN, CATALOG.CAREINSTRUCTIONS_FR, CATALOG.ADVICE_EN, CATALOG.ADVICE_FR, STYLE_COLOURS.COLOUR_DESC_ENG, STYLE_COLOURS.COLOUR_DESC_FR, NVL(L1I.VALUE_EN, CATALOG.CATAGORY) AS CATEGORY_EN, NVL(L1I.VALUE_FR, CATALOG.CATAGORY) AS CATEGORY_FR, NVL(L2I.VALUE_EN, CATALOG.CATAGORY_LEVEL_1A) AS CATEGORY_LEVEL_1A_EN, NVL(L2I.VALUE_FR, CATALOG.CATAGORY_LEVEL_1A) AS CATEGORY_LEVEL_1A_FR, NVL(L3I.VALUE_EN, CATALOG.CATAGORY_LEVEL_2A) AS CATEGORY_LEVEL_2A_EN, NVL(L3I.VALUE_FR, CATALOG.CATAGORY_LEVEL_2A) AS CATEGORY_LEVEL_2A_FR, CATALOG.WEBSTATUS, CATALOG.SEASON_CD, STYLE_COLOURS.COLOUR_ID AS COLORID, CATALOG.UNIT_PRICE, CATALOG.VSN AS VSN, CATALOG.SUBCLASS, CAST(CATALOG.SIZE_CHART AS NUMBER(13)) AS SIZE_CHART, CATALOG.EFFECTIVE_DATE AS CREATED_DATE, CA.UPD_TIMESTAMP AS CA_UPD_TIMESTAMP, SCA.UPD_TIMESTAMP AS SCA_UPD_TIMESTAMP, GREATEST( COALESCE(CA.UPD_TIMESTAMP, SCA.UPD_TIMESTAMP), COALESCE(SCA.UPD_TIMESTAMP, CA.UPD_TIMESTAMP) ) AS UPD_TIMESTAMP, GREATEST( COALESCE(CA.UPD_TIMESTAMP, SCA.UPD_TIMESTAMP), COALESCE(SCA.UPD_TIMESTAMP, CA.UPD_TIMESTAMP) ) AS LAST_MODIFIED_DATE, CATALOG.ONLINEFROMDATE, STYLE_COLOURS.COLOURGROUP_EN AS TRUE_COLOURGROUP_EN, STYLE_COLOURS.COLOURGROUP_FR AS TRUE_COLOURGROUP_FR
	FROM
		(
		SELECT
			STYLEID, MAX(UPD_TIMESTAMP) AS UPD_TIMESTAMP
		FROM
			ELCAT.CATALOG_AUDIT
		GROUP BY
			STYLEID ) CA
	INNER JOIN ELCAT.CATALOG ON
		CATALOG.STYLEID = ca.STYLEID
	INNER JOIN ELCAT.STYLE_COLOURS ON
		STYLE_COLOURS.STYLEID = CATALOG.STYLEID
	LEFT JOIN ELCAT.DICTIONARYITEM L1I ON
		LOWER(L1I.CODE) = LOWER(CATALOG.CATAGORY)
		AND L1I.DICTIONARYID = 1
	LEFT JOIN ELCAT.DICTIONARYITEM L2I ON
		LOWER(L2I.CODE) = LOWER(CATALOG.CATAGORY_LEVEL_1A)
		AND L2I.DICTIONARYID = 2
	LEFT JOIN ELCAT.DICTIONARYITEM L3I ON
		LOWER(L3I.CODE) = LOWER(CATALOG.CATAGORY_LEVEL_2A)
		AND L3I.DICTIONARYID = 3
	LEFT JOIN (
		SELECT
			STYLEID, MAX(UPD_TIMESTAMP) AS UPD_TIMESTAMP
		FROM
			ELCAT.STYLE_COLOURS_AUDIT
		GROUP BY
			STYLEID ) SCA ON
		STYLE_COLOURS.STYLEID LIKE CONCAT(SCA.STYLEID, '-%')
	WHERE
		STYLE_COLOURS.IMAGE_STYLEID IS NOT NULL )

-- elcat-catalog-jdbc-source-recovery
SELECT
	*
FROM
	(
	SELECT
		*
	FROM
		(
		SELECT
			STYLE_COLOURS.IMAGE_STYLEID AS STYLEID, CATALOG.SUBDEPT, CATALOG.BRAND_NAME_ENG, CATALOG.BRAND_NAME_FR, CATALOG.DESC_ENG, CATALOG.DESC_FR, CATALOG.MARKET_DESC_ENG, CATALOG.MARKET_DESC_FR, CATALOG.DETAIL_DESC3_ENG, CATALOG.DETAIL_DESC3_FR, CATALOG.FABRICANDMATERIAL_EN, CATALOG.FABRICANDMATERIAL_FR, CATALOG.SIZE_DESC_ENG, CATALOG.SIZE_DESC_FR, CATALOG.CAREINSTRUCTIONS_EN, CATALOG.CAREINSTRUCTIONS_FR, CATALOG.ADVICE_EN, CATALOG.ADVICE_FR, STYLE_COLOURS.COLOUR_DESC_ENG, STYLE_COLOURS.COLOUR_DESC_FR, NVL(L1I.VALUE_EN, CATALOG.CATAGORY) AS CATEGORY_EN, NVL(L1I.VALUE_FR, CATALOG.CATAGORY) AS CATEGORY_FR, NVL(L2I.VALUE_EN, CATALOG.CATAGORY_LEVEL_1A) AS CATEGORY_LEVEL_1A_EN, NVL(L2I.VALUE_FR, CATALOG.CATAGORY_LEVEL_1A) AS CATEGORY_LEVEL_1A_FR, NVL(L3I.VALUE_EN, CATALOG.CATAGORY_LEVEL_2A) AS CATEGORY_LEVEL_2A_EN, NVL(L3I.VALUE_FR, CATALOG.CATAGORY_LEVEL_2A) AS CATEGORY_LEVEL_2A_FR, CATALOG.WEBSTATUS, CATALOG.SEASON_CD, STYLE_COLOURS.COLOUR_ID AS COLORID, CATALOG.UNIT_PRICE, CATALOG.VSN AS VSN, CATALOG.SUBCLASS, CAST(CATALOG.SIZE_CHART AS NUMBER(13)) AS SIZE_CHART, CATALOG.EFFECTIVE_DATE, CATALOG.EFFECTIVE_DATE AS CREATED_DATE, CATALOG.ONLINEFROMDATE, STYLE_COLOURS.COLOURGROUP_EN AS TRUE_COLOURGROUP_EN, STYLE_COLOURS.COLOURGROUP_FR AS TRUE_COLOURGROUP_FR
		FROM
			ELCAT.CATALOG
		INNER JOIN ELCAT.STYLE_COLOURS ON
			STYLE_COLOURS.STYLEID = CATALOG.STYLEID
		LEFT JOIN ELCAT.DICTIONARYITEM L1I ON
			LOWER(L1I.CODE) = LOWER(CATALOG.CATAGORY)
			AND L1I.DICTIONARYID = 1
		LEFT JOIN ELCAT.DICTIONARYITEM L2I ON
			LOWER(L2I.CODE) = LOWER(CATALOG.CATAGORY_LEVEL_1A)
			AND L2I.DICTIONARYID = 2
		LEFT JOIN ELCAT.DICTIONARYITEM L3I ON
			LOWER(L3I.CODE) = LOWER(CATALOG.CATAGORY_LEVEL_2A)
			AND L3I.DICTIONARYID = 3 )
	WHERE
		STYLEID IS NOT NULL )
WHERE
	EFFECTIVE_DATE >= sysdate - INTERVAL '300' MINUTE