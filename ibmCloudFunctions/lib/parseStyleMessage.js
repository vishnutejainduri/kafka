'use strict';

const TOPIC_NAME = 'styles-connect-jdbc-CATALOG';
const APPROVED_STATUS = 'Approved';
const JESTA_TRUE = 'Y';

// Map of source attribute names to mapped name. Translatable attributes are suffixed with _EN, _ENG, or _FR.
const translatableAttributeMap = {
    'BRAND_NAME': 'brandName',
    'DESC': 'name',
    'MARKET_DESC': 'marketingDescription',
    'DETAIL_DESC3': 'construction',
    'FABRICANDMATERIAL': 'fabricAndMaterials',
    'SIZE_DESC': 'styleAndMeasurements',
    'CAREINSTRUCTIONS': 'careInstructions',
    'ADVICE': 'advice',
    'COLOUR_DESC': 'colour',
    'TRUE_COLOURGROUP': 'colourGroup',
    'CATEGORY': 'level1Category',
    'CATEGORY_LEVEL_1A': 'level2Category',
    'CATEGORY_LEVEL_2A': 'level3Category'
};

const styleIdKey = 'STYLEID'

const endlessAislePromotionalSticker = {
    en: 'Online Only',
    fr: 'En ligne seulement'
};

// Map of source attribute names to mapped name. Non-translatable attribute names
const attributeMap = {
    [styleIdKey]: 'id',
    'WEBSTATUS': 'webStatus',
    'SEASON_CD': 'season',
    'COLORID': 'colourId',
    'CREATED_DATE': 'createdDate',
    'LASTMODIFIEDDATE': 'lastModifiedDate',
    'LASTMODIFIEDDATE_COLOURS': 'lastModifiedDateColours',
    'ONLINEFROMDATE': 'onlineFromDate',
    'UNIT_PRICE': 'originalPrice',
    'SUBDEPT': 'departmentId',
    'VSN': 'vsn',
    'SIZE_CHART': 'sizeChart',
    'RANKINGUNITSSOLD': 'rankingUnitsSold',
    'EA_IND': 'isEndlessAisle',
    'RETURNABLE_IND': 'isReturnable'
};

const transforms = {
    'id': (id) => id.match(/\d+/)[0] // strip "-00" if it exists
};

function filterStyleMessages(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse Catalog update messages');
    }

    // We want to filter out any "pseudo styles" until a later release. That is, any style with a suffix greater than -00. eg. -10 or -05
    const hasStyleSuffixGreaterThan00 = /^\d+-(1\d|0[1-9])$/;
    return !msg.value.STYLEID.match(hasStyleSuffixGreaterThan00);
}

// Parse a message from the ELCAT.CATALOG table and return a new object with filtered and re-mapped attributes.
function parseStyleMessage(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse Catalog update messages');
    }

    // Re-map atttributes
    const styleData = {};
    for (let sourceAttributeName in translatableAttributeMap) {
        styleData[translatableAttributeMap[sourceAttributeName]] = {
            'en': msg.value[sourceAttributeName + '_EN'] || msg.value[sourceAttributeName + '_ENG'] || msg.value[sourceAttributeName] || null,
            'fr': msg.value[sourceAttributeName + '_FR'] || null
        }
    }
    for (let sourceAttributeName in attributeMap) {
        styleData[attributeMap[sourceAttributeName]] = msg.value[sourceAttributeName];
    }

    for (let transformField in transforms) {
        styleData[transformField] = transforms[transformField](styleData[transformField]);
    }

    // VSNs are actually supposed to be compounded with two other fields for uniqueness
    styleData.relatedProductId = styleData.vsn + msg.value.SUBCLASS + styleData.brandName.en;

    styleData.webStatus = styleData.webStatus === APPROVED_STATUS;
    styleData.isEndlessAisle = styleData.isEndlessAisle === JESTA_TRUE;
    styleData.lastModifiedDate = (styleData.lastModifiedDateColours > styleData.lastModifiedDate || !styleData.lastModifiedDate) ? styleData.lastModifiedDateColours : styleData.lastModifiedDate

    if (styleData.isEndlessAisle) {
        styleData.promotionalSticker = endlessAislePromotionalSticker;
    }
    styleData.webStatus = styleData.webStatus === APPROVED_STATUS ? true : false;
    styleData.isReturnable = styleData.isReturnable === 'Y' ? true : false


    // Add _id for mongo
    styleData._id = styleData.id;

    return styleData;
}

module.exports = {
    topicName: TOPIC_NAME,
    styleIdKey,
    parseStyleMessage,
    filterStyleMessages
};
