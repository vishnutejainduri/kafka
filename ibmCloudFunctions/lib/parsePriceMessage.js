'use strict';
const createError = require('./createError');

const TOPIC_NAME = 'prices-connect-jdbc';

const ONLINE_SITE_ID = '00990';
const IN_STORE_SITE_ID = '00011';

// Map of source attribute names to mapped name. Non-translatable attribute names
const attributeMap = {
    STYLE_ID: 'styleId',
    SITE_ID: 'siteId',
    NEW_RETAIL_PRICE: 'newRetailPrice'
};

function filterPriceMessages(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse Price update messages');
    }

    return true;
}

// Parse a message from the MERCH.IRO_POS_PRICES table and return a new object with filtered and re-mapped attributes.
function parsePriceMessage(msg) {
    // Re-map attributes
    const priceData = {};
    for (let sourceAttributeName in attributeMap) {
        priceData[attributeMap[sourceAttributeName]] = msg.value[sourceAttributeName];
    }

    if (!priceData.styleId) {
        throw createError.parsePriceMessage.noStyleId()
    }

    priceData._id = priceData.styleId;

    return priceData;
}

function generateUpdateFromParsedMessage(priceData, styleData) {
    const updateToProcess = {
        _id: priceData.styleId,
        id: priceData.styleId
    };
    switch (priceData.siteId) {
        case ONLINE_SITE_ID:
            updateToProcess.onlineSalePrice = priceData.newRetailPrice;
            break;
        case IN_STORE_SITE_ID:
            updateToProcess.inStoreSalePrice = priceData.newRetailPrice;
            break;
        default:
            break;
    }
    update.currentPrice = update.onlineSalePrice || styleData.originalPrice;
    const priceString = update.currentPrice ? update.currentPrice.toString() : '';
    const priceArray = priceString.split('.');
    update.isSale = priceArray.length > 1 ? priceArray[1] === '99' : false;
    return updateToProcess;
}

module.exports = {
    parsePriceMessage,
    filterPriceMessages,
    IN_STORE_SITE_ID,
    ONLINE_SITE_ID,
    generateUpdateFromParsedMessage
};
