'use strict';
const { camelCase } = require('./utils');

const facetMap = {
    "Category": "style",
    "Fabric": "fabric",
    "Length": "length",
    "Fit": "fit",
    "Sleeve": "collar",
    "Pattern": "pattern",
    "Cuff": "cuff",
};

const facetTypeMap = {
  "DPM01": "microsite"
};

// Parse a message from the ELCAT.CATALOG table and return a new object with filtered and re-mapped attributes.
function parseFacetMessage(msg) {
    const facetName = facetMap[msg.value.CATEGORY] || facetTypeMap[msg.value.CHARACTERISTIC_TYPE_ID] || camelCase(msg.value.CATEGORY);
    return {
        styleId: msg.value.STYLEID,
        typeId: msg.value.CHARACTERISTIC_TYPE_ID,
        facetName,
        facetValue: {
            en: msg.value.DESC_ENG,
            fr: msg.value.DESC_FR
        },
        isMarkedForDeletion: msg.value.UPD_FLG === 'F'
    };
}

module.exports = {
    parseFacetMessage
};
