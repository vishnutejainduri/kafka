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

const clearancePromotionalSticker = {
    en: 'Final Sale',
    fr: 'Final Sale'
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

    styleData.webStatus = styleData.webStatus === APPROVED_STATUS;
    styleData.isEndlessAisle = styleData.isEndlessAisle === JESTA_TRUE;
    styleData.lastModifiedDate = (styleData.lastModifiedDateColours > styleData.lastModifiedDate || !styleData.lastModifiedDate) ? styleData.lastModifiedDateColours : styleData.lastModifiedDate

    if (styleData.isEndlessAisle) {
        styleData.promotionalSticker = endlessAislePromotionalSticker;
    }
    styleData.webStatus = styleData.webStatus === APPROVED_STATUS ? true : false;

    if (styleData.isReturnable === JESTA_TRUE) {
        styleData.isReturnable = true
    } else {
        styleData.isReturnable = false
        styleData.promotionalSticker = clearancePromotionalSticker
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
    clearancePromotionalSticker
};
