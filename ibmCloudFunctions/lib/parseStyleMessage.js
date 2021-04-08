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
const {
    clearancePromotionalSticker: inboundClearancePromotionalSticker,
    languageKeys
} = require('../commercetools/constantsCt')

const styleIdKey = 'STYLEID'

const clearancePromotionalSticker = {
    en: inboundClearancePromotionalSticker[[languageKeys.ENGLISH]],
    fr: inboundClearancePromotionalSticker[[languageKeys.FRENCH]]
}

const blankPromotionalSticker = {
    en: null,
    fr: null
}

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

function filterStyleMessages(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse Catalog update messages');
    }

    return true
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

    // VSNs are actually supposed to be compounded with two other fields for uniqueness
    styleData.relatedProductId = styleData.vsn + msg.value.SUBCLASS + styleData.brandName.en;

    styleData.isEndlessAisle = styleData.isEndlessAisle === JESTA_TRUE;
    styleData.lastModifiedDate = (styleData.lastModifiedDateColours > styleData.lastModifiedDate || !styleData.lastModifiedDate) ? styleData.lastModifiedDateColours : styleData.lastModifiedDate
    styleData.webStatus = styleData.webStatus === APPROVED_STATUS
    styleData.isReturnable = styleData.isReturnable === JESTA_TRUE

    if (!styleData.isReturnable) {
        styleData.promotionalSticker = clearancePromotionalSticker
    }

    // Sales ranking data
    styleData.ranks = {
        0: msg.value.RANK0,
        1: msg.value.RANK1,
        2: msg.value.RANK2,
        3: msg.value.RANK3,
        4: msg.value.RANK4,
        5: msg.value.RANK5,
        6: msg.value.RANK6,
        7: msg.value.RANK7,
        8: msg.value.RANK8,
        9: msg.value.RANK9
    }

    // Add _id for mongo
    styleData._id = styleData.id;
    return styleData;
}

module.exports = {
    topicName: TOPIC_NAME,
    styleIdKey,
    parseStyleMessage,
    filterStyleMessages,
    blankPromotionalSticker,
    clearancePromotionalSticker
};
