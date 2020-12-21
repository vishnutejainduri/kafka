'use strict';
const { MICROSITE, PROMO_STICKER } = require('./constants');

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
  "DPM01": MICROSITE,
  "15": PROMO_STICKER
};

// Parse a message from the ELCAT.CATALOG table and return a new object with filtered and re-mapped attributes.
function parseFacetMessage(msg) {
    const facetName = facetMap[msg.value.CATEGORY] || facetTypeMap[msg.value.CHARACTERISTIC_TYPE_ID]
    if (!facetName) {
      throw new Error('Invalid facet id mapping')
    }
    return {
        styleId: msg.value.STYLEID,
        typeId: msg.value.CHARACTERISTIC_TYPE_ID,
        facetId: `facetid_${msg.value.CHARACTERISTIC_VALUE_ID}`,
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
