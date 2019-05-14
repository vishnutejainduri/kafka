const expect = require('chai').expect;

const parseStyleMessage = require('../lib/parseStyleMessage');

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
        "CATAGORY": null,
        "CATAGORY_LEVEL_1A": "CASUAL WEAR",
        "CATAGORY_LEVEL_1B": null,
        "CATAGORY_LEVEL_1C": null,
        "CATAGORY_LEVEL_2A": "Sweaters & Knits",
        "CATAGORY_LEVEL_2B": null,
        "CATAGORY_LEVEL_2C": null,
        "CATAGORY_LEVEL_3A": null,
        "CATAGORY_LEVEL_3B": null,
        "CATAGORY_LEVEL_3C": null,
        "CATAGORY_LEVEL_4A": null,
        "CATAGORY_LEVEL_4B": null,
        "CATAGORY_LEVEL_4C": null,
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
        "WORK_FLOW_TEMPLATE": null
    }
};


describe('parseStyleMessage', () => {
    it('should only work for messages about the relevant topic', () => {
        const wrongTopicMessage = { topic: 'foobar' };
        expect(parseStyleMessage.bind(null, wrongTopicMessage)).to.throw('Can only parse Catalog update messages');
    });

    it('should transform translatable fields that are populated', () => {
       const actual = parseStyleMessage(testData);
       expect(actual.brandName).to.deep.equal({ en: 'Thom Browne', fr: 'Thom Brownefr' });
    });

    it('should generate `{en: null, fr: null}` for translatable fields that are not populated', () => {
        const actual = parseStyleMessage(testData);
        expect(actual.construction).to.deep.equal({ en: null, fr: null });
    });

    it('should filter out "pseudo styles"', () => {
       const actual1 = parseStyleMessage({ topic: 'styles-connect-jdbc-CATALOG', value: { STYLEID: '1234-01' } });
       const actual2 = parseStyleMessage({ topic: 'styles-connect-jdbc-CATALOG', value: { STYLEID: '1234-11' } });

       expect(actual1).to.be.null;
       expect(actual2).to.be.null;
    });
});