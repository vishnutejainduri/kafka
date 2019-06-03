'use strict';

const TOPIC_NAME = 'styles-connect-jdbc-CATALOG';

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
    'CATAGORY': 'level1Category',
    'CATAGORY_LEVEL_1A': 'level2Category',
    'CATAGORY_LEVEL_2A': 'level3Category'
};

// Map of source attribute names to mapped name. Non-translatable attribute names
const attributeMap = {
    'STYLEID': 'id',
    'WEBSTATUS': 'webStatus',
    'SEASON_CD': 'season',
    'COLORID': 'colourId',
    'APPROVED_FOR_WEB': 'approvedForWeb',
    'EFFECTIVE_DATE': 'effectiveDate',
    'UNIT_PRICE': 'originalPrice'
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

// https://stackoverflow.com/a/2970667/10777917
function camelCase(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
        if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
        return index == 0 ? match.toLowerCase() : match.toUpperCase();
    });
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

    // init the rest of the known facets to help with data consistency
    styleData.style = styleData.style || {en: null, fr: null};
    styleData.fabric = styleData.fabric || {en: null, fr: null};
    styleData.length = styleData.length || {en: null, fr: null};
    styleData.fit = styleData.fit || {en: null, fr: null};
    styleData.collar = styleData.collar || {en: null, fr: null};
    styleData.pattern = styleData.pattern || {en: null, fr: null};
    styleData.cuff = styleData.cuff || {en: null, fr: null};

    // Add _id for mongo
    styleData._id = styleData.id;

    return styleData;
}

module.exports = {
    parseStyleMessage,
    filterStyleMessages
};
