'use strict';
const { languageKeys } = require('../commercetools/constantsCt');

const TOPIC_NAME = 'facets-connect-jdbc-STYLE_ITEM_CHARACTERISTICS_ECA';

const facetIdMap = {
    "15": "promotionalSticker",
};

function filterFacetMessageCt(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse facet update messages');
    }

    return facetIdMap[msg.value.CHARACTERISTIC_TYPE_ID];
}

function parseFacetMessageCt(msg) {
    const facetName = facetIdMap[msg.value.CHARACTERISTIC_TYPE_ID];
    const facetObj = {
        _id: msg.value.STYLEID,
        id: msg.value.STYLEID
    };
    facetObj[facetName] = {
        [languageKeys.ENGLISH]: msg.value.DESC_ENG,
        [languageKeys.FRENCH]: msg.value.DESC_FR
    }
    return facetObj;
}

module.exports = {
    parseFacetMessageCt,
    filterFacetMessageCt
};
