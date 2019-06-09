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
    const returnVal = {
        _id: msg.value.STYLEID,
        id: msg.value.STYLEID
    };
    returnVal[`${facetName}`] = {
        en: msg.value.DESC_ENG,
        fr: msg.value.DESC_FR
    };
    return returnVal;
}

module.exports = {
    parseFacetMessage
};
