This function is used to listen for incoming facet messages and add them to a queue for bulk updating Algolia.
If we just send them to Algolia as we get them, we'll quickly expend many API requests, as each message contains one
message for one style. Thus we need to add them to an intermediary queue for bulk updating. This entire flow needs to go
away when they update the DPM db version to 12 - then we can easily use this query to get all facets inline with the
original style row:

SELECT CATALOG.*,
       FACETS.*,
       STYLE_COLOURS.COLOURGROUP_EN AS TRUE_COLOURGROUP_EN,
       STYLE_COLOURS.COLOURGROUP_FR AS TRUE_COLOURGROUP_FR
FROM ELCAT.CATALOG
         LEFT JOIN ELCAT.STYLE_COLOURS ON STYLE_COLOURS.STYLEID = CATALOG.STYLEID
         LEFT JOIN (SELECT STYLEID                                                                    AS FACET_STYLEID,
                           LISTAGG(CATEGORY || ':' || DESC_ENG, ',') WITHIN GROUP (ORDER BY CATEGORY) AS FACETS_ENG,
                           LISTAGG(CATEGORY || ':' || DESC_FR, ',') WITHIN GROUP (ORDER BY CATEGORY)  AS FACETS_FR
                    FROM ELCAT.STYLE_ITEM_CHARACTERISTICS_ECA
                    GROUP BY STYLEID) FACETS ON CATALOG.STYLEID LIKE FACETS.FACET_STYLEID || '%';