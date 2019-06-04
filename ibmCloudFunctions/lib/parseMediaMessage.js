'use strict';

// Map of source attribute names to mapped name. Non-translatable attribute names
const attributeMap = {
    ID: 'id',
    CONTAINER_ID: 'containerId',
    QUALIFIER: 'qualifier',
    IMAGE_PATH: 'imagePath',
    MODIFIEDTS: 'modifiedTs',
};

// Parse a message from the MERCH.IRO_POS_PRICES table and return a new object with filtered and re-mapped attributes.
function parseMediaMessage(msg) {
    // Re-map attributes
    const priceData = {};
    for (let sourceAttributeName in attributeMap) {
        priceData[attributeMap[sourceAttributeName]] = msg.value[sourceAttributeName];
    }

    priceData._id = priceData.id;

    return priceData;
}

module.exports = {
    parseMediaMessage
};
