wsk action invoke --apihost localhost -i -u 23bc46b1-71f6-4ed5-8c54-816aa4f8c502:123zO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP --blocking -r catalogprice -p topicName styles-connect-jdbc-CATALOG -p collectionName styles -p pricesCollectionName prices -p bulkAtsRecalculateQueue bulkAtsRecalculateQueue -p mongoUri "mongodb://ibm_cloud_dcb36325_d4b1_4f46_95e0_0d81b847f11f:48ecf065854ea7b71e3f549b942652659d00eddc644b7850f4ea796ac4409880@8794269a-eb02-499e-b775-b1319057b428-0.bn2a2vgd01r3l0hfmvc0.databases.appdomain.cloud:30767,8794269a-eb02-499e-b775-b1319057b428-1.bn2a2vgd01r3l0hfmvc0.databases.appdomain.cloud:30767/ibmclouddb?authSource=admin&replicaSet=replset" -p dbName ibmclouddb -p mongoCertificateBase64 "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUREekNDQWZlZ0F3SUJBZ0lKQU5FSDU4eTIva3pITUEwR0NTcUdTSWIzRFFFQkN3VUFNQjR4SERBYUJnTlYKQkFNTUUwbENUU0JEYkc5MVpDQkVZWFJoWW1GelpYTXdIaGNOTVRnd05qSTFNVFF5T1RBd1doY05Namd3TmpJeQpNVFF5T1RBd1dqQWVNUnd3R2dZRFZRUUREQk5KUWswZ1EyeHZkV1FnUkdGMFlXSmhjMlZ6TUlJQklqQU5CZ2txCmhraUc5dzBCQVFFRkFBT0NBUThBTUlJQkNnS0NBUUVBOGxwYVFHemNGZEdxZU1sbXFqZmZNUHBJUWhxcGQ4cUoKUHIzYklrclhKYlRjSko5dUlja1NVY0NqdzRaL3JTZzhublQxM1NDY09sKzF0bys3a2RNaVU4cU9XS2ljZVlaNQp5K3laWWZDa0dhaVpWZmF6UUJtNDV6QnRGV3YrQUIvOGhmQ1RkTkY3Vlk0c3BhQTNvQkUyYVM3T0FOTlNSWlNLCnB3eTI0SVVnVWNJTEpXK21jdlc4MFZ4K0dYUmZEOVl0dDZQUkpnQmhZdVVCcGd6dm5nbUNNR0JuK2wyS05pU2YKd2VvdllEQ0Q2Vm5nbDIrNlc5UUZBRnRXWFdnRjNpRFFENW5sL240bXJpcE1TWDZVRy9uNjY1N3U3VERkZ2t2QQoxZUtJMkZMellLcG9LQmU1cmNuck03bkhnTmMvbkNkRXM1SmVjSGIxZEh2MVFmUG02cHpJeHdJREFRQUJvMUF3ClRqQWRCZ05WSFE0RUZnUVVLMytYWm8xd3lLcytERW9ZWGJIcnV3U3BYamd3SHdZRFZSMGpCQmd3Rm9BVUszK1gKWm8xd3lLcytERW9ZWGJIcnV3U3BYamd3REFZRFZSMFRCQVV3QXdFQi96QU5CZ2txaGtpRzl3MEJBUXNGQUFPQwpBUUVBSmY1ZHZselVwcWFpeDI2cUpFdXFGRzBJUDU3UVFJNVRDUko2WHQvc3VwUkhvNjNlRHZLdzh6Ujd0bFdRCmxWNVAwTjJ4d3VTbDlacUFKdDcvay8zWmVCK25Zd1BveU8zS3ZLdkFUdW5SdmxQQm40RldWWGVhUHNHKzdmaFMKcXNlam1reW9uWXc3N0hSekdPekpINFpnOFVONm1mcGJhV1NzeWFFeHZxa25DcDlTb1RRUDNENjdBeldxYjF6WQpkb3FxZ0dJWjJueENrcDUvRlh4Ri9UTWI1NXZ0ZVRRd2ZnQnk2MGpWVmtiRjdlVk9XQ3YwS2FOSFBGNWhycWJOCmkrM1hqSjcvcGVGM3hNdlRNb3kzNURjVDNFMlplU1Zqb3VaczE1Tzkwa0kzazJkYVMyT0hKQUJXMHZTajRuTHoKK1BRenAvQjljUW1PTzhkQ2UwNDlRM29hVUE9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCgo=" -p algoliaIndexName "test_styles" -p algoliaApiKey "32be66c824cfac4d5a82a6326388f25a" -p algoliaAppId "CDROBE4GID" -p messages "[{\"topic\":\"styles-connect-jdbc-CATALOG\",\"value\":{\"STYLEID\":\"53360748-00\",\"SUBDEPT\":\"37\",\"CLASS\":\"5336\",\"SUBCLASS\":\"345336\",\"DESC_ENG\":\"Stretch-Cotton Sweatshirt\",\"DESC_FR\":\"Pull en coton extensible\",\"ALT_DESC_ENG\":null,\"ALT_DESC_FR\":null,\"MARKET_DESC_ENG\":\"Neil Barrett's eclectic attitude shines through in this stretch-cotton blend sweatshirt. It's equipped with multiple pockets, ribbed knit trims and an eye-catching grosgrain detail with a metal loop on the left chest. Of this collection, the designer states that it is born out of a British subculture – but seen from today’s perspective, through the eyes of the multi-cultural society we live in today. It is nostalgic and forward-looking at the same time. Simply throw on the versatile black pullover with a pair of coordinating joggers and you'll be ready to go wherever the weekend takes you.\",\"MARKET_DESC_FR\":\"L’approche éclectique de Neil Barrett transparait sur ce pull en coton extensible équipé de plusieurs poches, de bordures en tricot côtelé et d’un détail en gros-grain et en métal qui attire l’œil. Le créateur a dit de cette collection qu’elle est « née de la sous-culture britannique, mais considérée dans la perspective d’aujourd’hui et à travers le regard de la société multiculturelle dans laquelle nous vivons actuellement. Elle est à la fois nostalgique et avant-gardiste. » Vous n’avez qu’à ajouter un pantalon sport coordonné, peu importe où la route vous mène durant les weekends.\",\"MARKET_DESC_ENG2\":null,\"MARKET_DESC_FR2\":null,\"UNIT_PRICE\":905,\"DEACTIVE_DATE\":null,\"SEARCH_KEYWORDS\":\"Neil Barrett Stretch-Cotton Sweatshirt\",\"CAT_SEQUENCE\":\"AZA=\",\"BRAND_NAME_ENG\":\"Neil Barrett\",\"BRAND_NAME_FR\":\"Neil Barrett\",\"WEIGHT\":\"AA==\",\"TAXABLE\":\"Y\",\"TAX_GROUP_ID\":\"0\",\"SIZE_CHART\":\"BA==\",\"CATAGORY_LEVEL_1A\":\"CASUAL WEAR\",\"CATAGORY_LEVEL_2A\":\"Sweaters & Knits\",\"VENDOR_STOCK_NUMBER\":\"PBJS511P M506-01\",\"COLOUR_DESC_ENG\":null,\"COLOUR_DESC_FR\":null,\"DIM_DESC_ENG\":null,\"DIM_DESC_FR\":null,\"DIM_SEQUENCE\":\"AA==\",\"SIZE_DESC_ENG\":\"<li> Contemporary fit\n<li> Chest circumference: 41 in\n<li> Measurement is based on size M\",\"SIZE_DESC_FR\":\"<li> Coupe contemporaine\n<li> Tour de poitrine : 104,1 cm (41 po)\n<li> Mesure(s) prise(s) sur la taille M\",\"REGULAR_PRICE\":905,\"SALE_PRICE\":null,\"SALE_PRICE_START_DT\":null,\"SALE_PRICE_END_DT\":null,\"SIZE_SEQUENCE\":\"AA==\",\"EXPORT_FLAG\":1564708633000,\"WORK_FLOW_TEMPLATE\":null,\"IMAGE\":null,\"VSN\":\"PBJS511P M506\",\"AVAIL_DATE\":null,\"PRODUCTINDEXID\":null,\"GL_ACCOUNT\":null,\"CATAGORY_LEVEL_3A\":null,\"CATAGORY_LEVEL_4A\":null,\"CATAGORY_LEVEL_1B\":null,\"CATAGORY_LEVEL_2B\":null,\"CATAGORY_LEVEL_3B\":null,\"CATAGORY_LEVEL_4B\":null,\"CATAGORY_LEVEL_1C\":null,\"CATAGORY_LEVEL_2C\":null,\"CATAGORY_LEVEL_3C\":null,\"CATAGORY_LEVEL_4C\":null,\"PRMOTIONPRICE\":null,\"PROMOTIONQTY\":null,\"FABRICDESC_ENG\":null,\"FABRICDESC_FR\":null,\"CROSS_SELL_CATEGORY\":null,\"MARKET_DESC_WORDLINK_ENG\":null,\"MARKET_DESC_WORDLINK_FR\":null,\"EXPORT_COUNTRIES\":null,\"DETAIL_DESC3_ENG\":\"<li> Crew neck\n<li> Kangaroo pocket\n<li> Zipper pockets on sleeves\n<li> Flap pockets on sleeves\n<li> Ribbed knit collar, cuffs and hemline\n<li> Grosgrain detail with metal loop on left chest\",\"DETAIL_DESC3_FR\":\"<li> Encolure ronde\n<li> Poche kangourou\n<li> Poches à glissière sur les manches\n<li> Poches à rabat sur les manches\n<li> Col, poignets et bord inférieur en tricot côtelé\n<li> Détail en gros-grain avec anneau en métal sur la poitrine\",\"MARKDOWN\":null,\"EXT_DESC3_ENG\":null,\"EXT_DESC3_FR\":null,\"EXT_DESC4_ENG\":null,\"EXT_DESC4_FR\":null,\"EXT_DESC5_ENG\":null,\"EXT_DESC5_FR\":null,\"ITEMTYPE_ID\":null,\"VENDOR_CD\":\"009811\",\"PUBLISH_TO_WEB\":\"Y  \",\"CROSS_SELL_STYLE1\":null,\"CROSS_SELL_STYLE2\":null,\"GROUP_ITEM\":\"N  \",\"IMAGE_ALT_1\":null,\"IMAGE_ALT_2\":null,\"IMAGE_ALT_3\":null,\"IMAGE_ALT_4\":null,\"IMAGE_GROUP\":null,\"IMAGE_UPLOADED\":null,\"COLORID\":null,\"STORE_REPLENISH\":null,\"BUYERS_COMMENTS\":null,\"EMAIL_TEMPLATE\":null,\"MARKETING_ONLY\":null,\"SEASON_CD\":\"FA-19\",\"EFFECTIVE_DATE\":1573807274011,\"INV_990\":null,\"INV_FULLFILL\":\"AsUXvvpqx3D+669dOqAebDs9yvmNgcQl3p7e5kRi0XK3pJ5MsM4AAAAAAAAAAAAAAAAAAAAA\",\"DUEDATE\":null,\"VENDORIMAGE\":null,\"COMMENTS\":null,\"STARTDATE\":null,\"COLOURLEVEL1\":null,\"COLOURLEVEL2\":null,\"STYLEHEADING_EN\":null,\"STYLEHEADING_FR\":null,\"WIDTH_EN\":null,\"WIDTH_FR\":null,\"SAMPLERECEIVED\":1560181246000,\"SAMPLERETURNED\":1561125060000,\"APPROVED_FOR_WEB\":1560514201000,\"PUBLISHED_TO_WEB\":1560517221000,\"CAREINSTRUCTIONS_EN\":\"<li> Machine wash, cold\n<li> Do not tumble dry\n<li> Iron, low\n<li> Do not dry clean\",\"CAREINSTRUCTIONS_FR\":\"<li> Lavage à la machine à l’eau froide\n<li> Pas de séchage par culbutage\n<li> Repassage à basse température\n<li> Pas de nettoyage à sec\",\"FABRICANDMATERIAL_EN\":\"<li> 48% cotton, 47% modal, 5% elastane\n<li> Black\",\"FABRICANDMATERIAL_FR\":\"<li> 48 % coton, 47 % modal, 5 % élasthanne\n<li> Noir\",\"ADVICE_EN\":null,\"ADVICE_FR\":null,\"COLOURGROUP_EN\":null,\"COLOURGROUP_FR\":null,\"DUPLICATE_OF_STYLE\":null,\"SEARCHKEYWORDS_FR\":\"pull chandail coton extensible\",\"SECONDLEVEL_FR\":null,\"THIRDLEVEL_FR\":null,\"STARTDATE_FR\":null,\"DUEDATE_FR\":null,\"WEBSTATUS\":\"Approved\",\"INV_SAMP\":\"CQ==\",\"CATAGORY\":\"CLOTHING\",\"TRUE_COLOURGROUP_EN\":\"Black\",\"TRUE_COLOURGROUP_FR\":\"Noir\"}}]"
