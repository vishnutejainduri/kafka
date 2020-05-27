'use strict';

const TOPIC_NAME = 'inventory-connect-jdbc-SKUINVENTORY';

// Map of source attribute names to mapped name. Non-translatable attribute names
const attributeMap = {
    'STYLE_ID': 'styleId',
    'SKU_ID': 'skuId',
    'STORE_ID': 'storeId',
    'QOH': 'quantityOnHand',
    'QOO': 'quantityOnOrder',
    'QBO': 'quantityBackOrder',
    'QIT': 'quantityInTransit',
    'QIP': 'quantityInPicking',
    'QOHSELLABLE': 'quantityOnHandSellable',
    'QOHNOTSELLABLE': 'quantityOnHandNotSellable',
    'LASTMODIFIEDDATE': 'lastModifiedDate'
};

function filterSkuInventoryMessage(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse SKUINVENTORY update messages');
    }

    return msg.value.INV_FKORGANIZATIONNO === '1';
}

// Parse a message from the VSTORE.SKUINVENTORY table and return a new object with filtered and re-mapped attributes.
function parseSkuInventoryMessage(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse SKU Inventory update messages');
    }

    // Re-map atttributes
    const inventoryData = {};
    for (let sourceAttributeName in attributeMap) {
        inventoryData[attributeMap[sourceAttributeName]] = msg.value[sourceAttributeName];
    }

    inventoryData['availableToSell'] = (inventoryData.quantityOnHandSellable - inventoryData.quantityInPicking) > 0
      ? (inventoryData.quantityOnHandSellable - inventoryData.quantityInPicking)
      : 0

    // Add _id for mongo
    inventoryData.id = `${inventoryData.styleId}-${inventoryData.skuId}-${inventoryData.storeId}`;
    inventoryData._id = inventoryData.id;

    return inventoryData;
}

module.exports = {
    parseSkuInventoryMessage,
    filterSkuInventoryMessage
};
