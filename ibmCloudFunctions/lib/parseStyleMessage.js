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
    'COLOURGROUP': 'colourGroup',
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
    'EFFECTIVE_DATE': 'effectiveDate'
};

// Parse a message from the ELCAT.CATALOG table and return a new object with filtered and re-mapped attributes.
function parseStyleMessage(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse Catalog update messages');
    }

    // Re-map atttributes
    const styleData = {};
    for (let sourceAttributeName in translatableAttributeMap) {
        styleData[translatableAttributeMap[sourceAttributeName]] = {
            // We don't have all the translated columns, most notably the categories. TODO to figure that out
            'en': msg.value[sourceAttributeName + '_EN'] || msg.value[sourceAttributeName + '_ENG'] || msg.value[sourceAttributeName],
            'fr': msg.value[sourceAttributeName + '_FR'] || null
        }
    }
    for (let sourceAttributeName in attributeMap) {
        styleData[attributeMap[sourceAttributeName]] = msg.value[sourceAttributeName];
    }

    // Custom logic for facets from DPM
    // This data comes in the format "CategoryName:categoryValue,CategoryName:categoryValue"
    // See the custom query for the ELCAT.CATALOG connector for more details
    const facetNameValuePattern = /^([^:]+):(.+)$/;
    if (msg.value['FACETS_ENG']) {
        msg.value['FACETS_ENG'].split(',').forEach((facetNameValue) => {
            const [, facetName, facetValue] = facetNameValuePattern.exec(facetNameValue);
            styleData[facetName] = { 'en': facetValue };
        })
    }

    if (msg.value['FACETS_FR']) {
        msg.value['FACETS_FR'].split(',').forEach((facetNameValue) => {
            const [, facetName, facetValue] = facetNameValuePattern.exec(facetNameValue);
            styleData[facetName].fr = facetValue;
        })
    }

    // Add _id for mongo
    styleData._id = styleData.id;

    return styleData;
}

module.exports = parseStyleMessage;
