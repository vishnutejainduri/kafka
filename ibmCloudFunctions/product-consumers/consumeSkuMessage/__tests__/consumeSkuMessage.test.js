const { parseSkuMessage, filterSkuMessages } = require('../../../lib/parseSkuMessage');

const consumeSkuMessage = require('../');

jest.mock("mongodb");

describe('parseSkuMessage', () => {
    it('should only work for messages about the relevant topic', () => {
        const wrongTopicMessage = { topic: 'foobar' };
        expect(parseSkuMessage.bind(null, wrongTopicMessage)).toThrow('Can only parse Catalog update messages');
    });

    it('should transform translatable fields that are populated', () => {
       const actual = parseSkuMessage(testData);
       expect(actual.brandName).toEqual({ en: 'Thom Browne', fr: 'Thom Brownefr' });
    });

    it('should generate `{en: null, fr: null}` for translatable fields that are not populated', () => {
        const actual = parseSkuMessage(testData);
        expect(actual.construction).toEqual({ en: null, fr: null });
    });

    it('should remove the dashes from style IDs', () => {
        const actual = parseSkuMessage(testData);
        expect(actual.id).toMatch((/^\d+$/));
    });
});

describe('filterSkuMessages', () => {
    it('should filter out "pseudo styles"', () => {
        const actual1 = [{ topic: 'styles-connect-jdbc-CATALOG', value: { STYLEID: '1234-01' } }].filter(filterSkuMessages);
        const actual2 = [{ topic: 'styles-connect-jdbc-CATALOG', value: { STYLEID: '1234-11' } }].filter(filterSkuMessages);
        const actual3 = [{ topic: 'styles-connect-jdbc-CATALOG', value: { STYLEID: '1234-00' } }].filter(filterSkuMessages);

        expect(actual1.length).toBe(0);
        expect(actual2.length).toBe(0);
        expect(actual3.length).toBe(1);
    });
})

describe('consumeSkuMessage', () => {
    it('missing all parameters; should fail', async () => {
        await expect(consumeSkuMessage({})).rejects.toThrow();
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
                    CATAGORY: 'catagory',
                    CATAGORY_LEVEL_1A: 'catagoryLevel1A',
                    CATAGORY_LEVEL_2A: 'catagoryLevel2A',
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
        const response = await consumeSkuMessage(params);
        // returns nothing/undefined if successfully run
        expect(response).toEqual(undefined);
    });
});
