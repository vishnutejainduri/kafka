'use strict';
const { languageKeys } = require('../commercetools/constantsCt');
const { MICROSITE, PROMO_STICKER } = require('./constants');

const TOPIC_NAME = 'facets-connect-jdbc-STYLE_ITEM_CHARACTERISTICS_ECA';

const facetIdMap = {
    "15": PROMO_STICKER,
    "DPM01": MICROSITE
};

const facetCategory = [
  "Promotional Sticker",
  "Micro Sites"
]

function filterFacetMessageCt(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse facet update messages');
    }
    return facetCategory.includes(msg.value.CATEGORY)
}

function parseFacetMessageCt(msg) {
    const facetName = facetIdMap[msg.value.CHARACTERISTIC_TYPE_ID];
    const facetObj = {
        _id: msg.value.STYLEID,
        id: msg.value.STYLEID,
        facetId: `facetid_${msg.value.CHARACTERISTIC_VALUE_ID}`,
        isMarkedForDeletion: msg.value.UPD_FLG === 'F',
        lastModified: new Date(msg.value.LAST_MODIFIED)
    };
    // If the facet is marked for deletion, set the value to null (unless it's a microsite)
    facetObj[facetName] = facetObj.isMarkedForDeletion && facetName !== MICROSITE 
        ? { [languageKeys.ENGLISH]: '', [languageKeys.FRENCH]: '' }
        : { [languageKeys.ENGLISH]: msg.value.DESC_ENG || '', [languageKeys.FRENCH]: msg.value.DESC_FR || '' };
    return facetObj;
}

module.exports = {
    parseFacetMessageCt,
    filterFacetMessageCt
};
