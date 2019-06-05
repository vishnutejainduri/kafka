'use strict';

const TOPIC_NAME = 'skus-connect-jdbc';

// Map of source attribute names to mapped name. Non-translatable attribute names
const attributeMap = {
    'ID': 'id',
    'STYLEID': 'styleId',
    'COLORID': 'colorId',
    'SIZEID': 'sizeId',
    'SIZE': 'size',
    'DIMENSION': 'dimension',
};

function filterSkuMessage(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse SKU update messages');
    }

    return msg.value.FKORGANIZATIONNO === '1';
}

// Parse a message from the VSTORE.SKU table and return a new object with filtered and re-mapped attributes.
function parseSkuMessage(msg) {
    // Re-map atttributes
    const skuData = {};
    for (let sourceAttributeName in attributeMap) {
        skuData[attributeMap[sourceAttributeName]] = msg.value[sourceAttributeName];
    }

    // Add _id for mongo
    skuData._id = skuData.id;

    return skuData;
}

module.exports = {
    filterSkuMessage,
    parseSkuMessage
};
