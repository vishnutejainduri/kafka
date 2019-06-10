'use strict';

const facetMap = {
    "Category": "style",
    "Fabric": "fabric",
    "Length": "length",
    "Fit": "fit",
    "Sleeve": "collar",
    "Pattern": "pattern",
    "Cuff": "cuff",
};

// Parse a message from the ELCAT.CATALOG table and return a new object with filtered and re-mapped attributes.
function parseFacetMessage(msg) {
    const facetName = facetMap[msg.value.CATEGORY];
    return {
        _id: msg.value.STYLEID + facetName,
        id: msg.value.STYLEID + facetName,
        styleId: msg.value.STYLEID,
        facetName,
        facetValue: {
            en: msg.value.DESC_ENG,
            fr: msg.value.DESC_FR
        }
    };
}

module.exports = {
    parseFacetMessage
};
