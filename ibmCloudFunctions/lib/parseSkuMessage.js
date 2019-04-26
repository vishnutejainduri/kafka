'use strict';

const TOPIC_NAME = 'sku-connect-jdbc-SKU';

// Map of source attribute names to mapped name. Non-translatable attribute names
const attributeMap = {
    'PKSKU': 'id',
    'SKUSTYLE': 'styleId',
    'SKUCOLOR': 'colorId',
    'SKUSIZE': 'sizeId',
    'SKUDIMENSION': 'dimensionId',
    'LASTMODIFIEDDATE': 'lastModifiedDate'
};

// Parse a message from the VSTORE.SKU table and return a new object with filtered and re-mapped attributes.
function parseSkuMessage(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse SKU update messages');
    }

    // Re-map atttributes
    const inventoryData = {};
    for (let sourceAttributeName in attributeMap) {
        inventoryData[attributeMap[sourceAttributeName]] = msg.value[sourceAttributeName];
    }

    // Add _id for mongo
    inventoryData._id = inventoryData.id;

    return inventoryData;
}

module.exports = parseSkuMessage;
