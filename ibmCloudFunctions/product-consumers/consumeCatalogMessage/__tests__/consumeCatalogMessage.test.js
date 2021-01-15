const { parseStyleMessage, filterStyleMessages } = require('../../../lib/parseStyleMessage');

const consumeCatalogMessage = require('../');

jest.mock("mongodb");

const testData = {
    "key": null,
    "offset": 139188,
    "partition": 0,
    "topic": "styles-connect-jdbc-CATALOG",
    "value": {
        "ADVICE_EN": null,
        "ADVICE_FR": null,
        "ALT_DESC_ENG": null,
        "ALT_DESC_FR": null,
        "APPROVED_FOR_WEB": null,
        "AVAIL_DATE": null,
        "BRAND_NAME_ENG": "Thom Browne",
        "BRAND_NAME_FR": "Thom Brownefr",
        "BUYERS_COMMENTS": null,
        "CAREINSTRUCTIONS_EN": null,
        "CAREINSTRUCTIONS_FR": null,
        'CATEGORY_EN': 'category_en',
        'CATEGORY_FR': 'category_fr',
        'CATEGORY_LEVEL_1A_EN': 'categoryLevel1A_en',
        'CATEGORY_LEVEL_1A_FR': 'categoryLevel1A_fr',
        'CATEGORY_LEVEL_2A_EN': 'categoryLevel2A_en',
        'CATEGORY_LEVEL_2A_FR': 'categoryLevel2A_fr',
        "CAT_SEQUENCE": "AA==",
        "CLASS": "5341",
        "COLORID": null,
        "COLOURGROUP_EN": null,
        "COLOURGROUP_FR": null,
        "COLOURLEVEL1": null,
        "COLOURLEVEL2": null,
        "COLOUR_DESC_ENG": null,
        "COLOUR_DESC_FR": null,
        "COMMENTS": null,
        "CROSS_SELL_CATEGORY": null,
        "CROSS_SELL_STYLE1": null,
        "CROSS_SELL_STYLE2": null,
        "DEACTIVE_DATE": null,
        "DESC_ENG": null,
        "DESC_FR": null,
        "DETAIL_DESC3_ENG": null,
        "DETAIL_DESC3_FR": null,
        "DIM_DESC_ENG": null,
        "DIM_DESC_FR": null,
        "DIM_SEQUENCE": "AA==",
        "DUEDATE": null,
        "DUEDATE_FR": null,
        "DUPLICATE_OF_STYLE": null,
        "EFFECTIVE_DATE": 1555545600000,
        "EMAIL_TEMPLATE": null,
        "EXPORT_COUNTRIES": null,
        "EXPORT_FLAG": 1555895759000,
        "EXT_DESC3_ENG": null,
        "EXT_DESC3_FR": null,
        "EXT_DESC4_ENG": null,
        "EXT_DESC4_FR": null,
        "EXT_DESC5_ENG": null,
        "EXT_DESC5_FR": null,
        "FABRICANDMATERIAL_EN": null,
        "FABRICANDMATERIAL_FR": null,
        "FABRICDESC_ENG": null,
        "FABRICDESC_FR": null,
        "FACETS_ENG": ":",
        "FACETS_FR": ":",
        "FACET_STYLEID": null,
        "GL_ACCOUNT": null,
        "GROUP_ITEM": "N ",
        "IMAGE": null,
        "IMAGE_ALT_1": null,
        "IMAGE_ALT_2": null,
        "IMAGE_ALT_3": null,
        "IMAGE_ALT_4": null,
        "IMAGE_GROUP": null,
        "IMAGE_UPLOADED": null,
        "INV_990": null,
        "INV_FULLFILL": null,
        "INV_SAMP": null,
        "ITEMTYPE_ID": null,
        "MARKDOWN": null,
        "MARKETING_ONLY": null,
        "MARKET_DESC_ENG": null,
        "MARKET_DESC_ENG2": null,
        "MARKET_DESC_FR": null,
        "MARKET_DESC_FR2": null,
        "MARKET_DESC_WORDLINK_ENG": null,
        "MARKET_DESC_WORDLINK_FR": null,
        "ORIGINAL_PRICE": 50.00,
        "PRMOTIONPRICE": null,
        "PRODUCTINDEXID": null,
        "PROMOTIONQTY": null,
        "PUBLISHED_TO_WEB": 1555642838000,
        "PUBLISH_TO_WEB": "N ",
        "REGULAR_PRICE": "AfQA",
        "SALE_PRICE": null,
        "SALE_PRICE_END_DT": null,
        "SALE_PRICE_START_DT": null,
        "SAMPLERECEIVED": null,
        "SAMPLERETURNED": null,
        "SEARCHKEYWORDS_FR": null,
        "SEARCH_KEYWORDS": null,
        "SEASON_CD": "FA-19",
        "SECONDLEVEL_FR": null,
        "SIZE_CHART": "BA==",
        "SIZE_DESC_ENG": null,
        "SIZE_DESC_FR": null,
        "SIZE_SEQUENCE": "AA==",
        "STARTDATE": null,
        "STARTDATE_FR": null,
        "STORE_REPLENISH": null,
        "STYLEHEADING_EN": null,
        "STYLEHEADING_FR": null,
        "STYLEID": "20045361-00",
        "SUBCLASS": "035341",
        "SUBDEPT": "41",
        "TAXABLE": "Y",
        "TAX_GROUP_ID": "0",
        "THIRDLEVEL_FR": null,
        "UNIT_PRICE": "AfQA",
        "VENDORIMAGE": null,
        "VENDOR_CD": "009747",
        "VENDOR_STOCK_NUMBER": "MKC002A-00014-415.",
        "VSN": "00014",
        "WEBSTATUS": null,
        "WEIGHT": "AA==",
        "WIDTH_EN": null,
        "WIDTH_FR": null,
        "WORK_FLOW_TEMPLATE": null,
        "LASTMODIFIEDDATE": 1602602938000,
        "LASTMODIFIEDDATE_COLOURS": 1402602938000,
    }
};


describe('parseStyleMessage', () => {
    it('should only work for messages about the relevant topic', () => {
        const wrongTopicMessage = { topic: 'foobar' };
        expect(parseStyleMessage.bind(null, wrongTopicMessage)).toThrow('Can only parse Catalog update messages');
    });

    it('should transform translatable fields that are populated', () => {
       const actual = parseStyleMessage(testData);
       expect(actual.brandName).toEqual({ en: 'Thom Browne', fr: 'Thom Brownefr' });
       expect(actual.level1Category).toEqual({ en: 'category_en', fr: 'category_fr' });
       expect(actual.level2Category).toEqual({ en: 'categoryLevel1A_en', fr: 'categoryLevel1A_fr' });
       expect(actual.level3Category).toEqual({ en: 'categoryLevel2A_en', fr: 'categoryLevel2A_fr' });
    });

    it('should generate `{en: null, fr: null}` for translatable fields that are not populated', () => {
        const actual = parseStyleMessage(testData);
        expect(actual.construction).toEqual({ en: null, fr: null });
    });

    it('should remove the dashes from style IDs', () => {
        const actual = parseStyleMessage(testData);
        expect(actual.id).toMatch((/^\d+$/));
    });

    it('should pick the highest last modified date', () => {
        const actual = parseStyleMessage(testData);
        expect(actual.lastModifiedDate).toEqual(testData.value.LASTMODIFIEDDATE)
    });

    it('should pick the highest last modified date', () => {
        const newTestDate = { ...testData, value: { ...testData.value, LASTMODIFIEDDATE_COLOURS: 1602603090000 } }
        const actual = parseStyleMessage(newTestDate);
        expect(actual.lastModifiedDate).toEqual(newTestDate.value.LASTMODIFIEDDATE_COLOURS)
    });
});

describe('filterStyleMessages', () => {
    it('should filter out "pseudo styles"', () => {
        const actual1 = [{ topic: 'styles-connect-jdbc-CATALOG', value: { STYLEID: '1234-01' } }].filter(filterStyleMessages);
        const actual2 = [{ topic: 'styles-connect-jdbc-CATALOG', value: { STYLEID: '1234-11' } }].filter(filterStyleMessages);
        const actual3 = [{ topic: 'styles-connect-jdbc-CATALOG', value: { STYLEID: '1234-00' } }].filter(filterStyleMessages);

        expect(actual1.length).toBe(0);
        expect(actual2.length).toBe(0);
        expect(actual3.length).toBe(1);
    });
})

describe('consumeCatalogMessage', () => {
    it('missing all parameters; should fail', async () => {
        expect((await consumeCatalogMessage({})).errorResult).toBeTruthy();
    });
    it('correct message to update style', async () => {
        const params = {
            topicName: 'styles-connect-jdbc-CATALOG',
            messages: [{
                topic: 'styles-connect-jdbc-CATALOG',
                value: {
                    STYLEID: '20000000',
                    SUBDEPT: 'subDept',
                    BRAND_NAME_ENG: 'brandNameEng',
                    BRAND_NAME_FR: 'brandNameFr',
                    DESC_ENG: 'descEng',
                    DESC_FR: 'descFr',
                    MARKET_DESC_ENG: 'marketDescEng',
                    MARKET_DESC_ENG2: 'marketDescEng2',
                    MARKET_DESC_FR: 'marketDescFr',
                    MARKET_DESC_FR2: 'marketDescFr2',
                    DETAIL_DESC3_ENG: 'detailDescEng',
                    DETAIL_DESC3_FR: 'detailDescFr',
                    FABRICANDMATERIAL_EN: 'fabricAndMaterialEn',
                    FABRICANDMATERIAL_FR: 'fabricAndMaterialFr',
                    SIZE_DESC_ENG: 'sizeDescEng',
                    SIZE_DESC_FR: 'sizeDescFr',
                    CAREINSTRUCTIONS_EN: 'careInstructionsEn',
                    CAREINSTRUCTIONS_FR: 'careInstructionsFr',
                    ADVICE_EN: 'adviceEn',
                    ADVICE_FR: 'adviceFr',
                    COLOUR_DESC_ENG: 'colourDescEng',
                    COLOUR_DESC_FR: 'colourDescFr',
                    CATEGORY_EN: 'category_en',
                    CATEGORY_FR: 'category_fr',
                    CATEGORY_LEVEL_1A_EN: 'categoryLevel1A_en',
                    CATEGORY_LEVEL_1A_FR: 'categoryLevel1A_fr',
                    CATEGORY_LEVEL_2A_EN: 'categoryLevel2A_en',
                    CATEGORY_LEVEL_2A_FR: 'categoryLevel2A_fr',
                    WEBSTATUS: 'webStatus',
                    SEASON_CD: 'seasonCd',
                    COLORID: 'colorId',
                    UNIT_PRICE: 0.0,
                    VSN: 'vsn',
                    SUBCLASS: 341,
                    UPD_TIMESTAMP: 1000000000000,
                    EFFECTIVE_DATE: 1000000000000,
                    TRUE_COLOURGROUP_EN: 'trueColourGroupEn',
                    TRUE_COLOURGROUP_FR: 'trueColourGroupFr'
                }
            }],
            mongoUri: 'mongo-uri',
            dbName: 'db-name',
            mongoCertificateBase64: 'mong-certificate',
            collectionName: 'styles',
            pricesCollectionName: 'prices',
            bulkAtsRecalculateQueue: 'bulkAtsRecalculateQueue'
        };
        const response = await consumeCatalogMessage(params);
        // returns messages
        expect(response).toEqual({
            errors: [],
            failureIndexes: [],
            successCount: 1,
            messages: params.messages,
            shouldResolveOffsets: 1
        });
    });
});
